#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Recursively calculates the size of a directory in bytes
 */
function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      try {
        if (item.isDirectory()) {
          totalSize += getDirectorySize(itemPath);
        } else if (item.isFile()) {
          const stats = fs.statSync(itemPath);
          totalSize += stats.size;
        }
      } catch (err) {
        // Skip items we can't access
        console.error(`Warning: Cannot access ${itemPath}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Warning: Cannot read directory ${dirPath}: ${err.message}`);
  }

  return totalSize;
}

/**
 * Recursively finds all directories matching the target names
 * @param {string} dirPath - The directory to search in
 * @param {string[]} targetNames - Array of directory names to find (e.g., ['node_modules', 'vendor'])
 * @param {Array} results - Accumulator for results
 */
function findTargetDirectories(dirPath, targetNames, results = []) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const itemPath = path.join(dirPath, item.name);

        if (targetNames.includes(item.name)) {
          results.push({ path: itemPath, type: item.name });
          // Don't recurse into matched directories
        } else {
          // Recursively search subdirectories
          findTargetDirectories(itemPath, targetNames, results);
        }
      }
    }
  } catch (err) {
    // Skip directories we can't access
    console.error(`Warning: Cannot read directory ${dirPath}: ${err.message}`);
  }

  return results;
}

/**
 * Formats bytes into human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Recursively deletes a directory and all its contents
 * SAFETY CHECK: Only deletes if the directory name is exactly "node_modules" or "vendor"
 * @param {string} dirPath - Path to the directory to delete
 * @param {string[]} allowedNames - Array of allowed directory names to delete
 */
function deleteDirectory(dirPath, allowedNames = ['node_modules', 'vendor']) {
  // CRITICAL SAFETY CHECK: Verify this is an allowed directory
  const dirName = path.basename(dirPath);
  if (!allowedNames.includes(dirName)) {
    throw new Error(`SAFETY CHECK FAILED: Refusing to delete directory "${dirName}". Only allowed: ${allowedNames.join(', ')}`);
  }

  // Additional safety check: Verify the path actually ends with one of the allowed names
  const endsWithAllowed = allowedNames.some(name =>
    dirPath.endsWith(name) ||
    dirPath.endsWith(name + '/') ||
    dirPath.endsWith(name + '\\')
  );

  if (!endsWithAllowed) {
    throw new Error(`SAFETY CHECK FAILED: Path does not end with allowed directory name: ${dirPath}`);
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error(`Error deleting ${dirPath}: ${err.message}`);
    return false;
  }
}

/**
 * Prompts user for confirmation
 */
function promptUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let cleanMode = false;
  let targetFolder = null;
  let scanModules = false;
  let scanVendor = false;

  for (const arg of args) {
    if (arg === '--clean') {
      cleanMode = true;
    } else if (arg === '--modules') {
      scanModules = true;
    } else if (arg === '--vendor') {
      scanVendor = true;
    } else if (!arg.startsWith('-')) {
      targetFolder = arg;
    }
  }

  // If neither flag is specified, default to scanning node_modules for backward compatibility
  if (!scanModules && !scanVendor) {
    scanModules = true;
  }

  return {
    cleanMode,
    targetFolder: targetFolder || process.cwd(),
    scanModules,
    scanVendor
  };
}

// Main execution wrapped in async function
async function main() {
  const { cleanMode, targetFolder: parentFolder, scanModules, scanVendor } = parseArgs();

  // Validate the parent folder exists
  if (!fs.existsSync(parentFolder)) {
    console.error(`Error: Directory "${parentFolder}" does not exist`);
    process.exit(1);
  }

  if (!fs.statSync(parentFolder).isDirectory()) {
    console.error(`Error: "${parentFolder}" is not a directory`);
    process.exit(1);
  }

  // Build list of target directory names to search for
  const targetNames = [];
  if (scanModules) targetNames.push('node_modules');
  if (scanVendor) targetNames.push('vendor');

  const targetDescription = targetNames.join(' and ');
  console.log(`Scanning for ${targetDescription} directories in: ${path.resolve(parentFolder)}\n`);

  // Find all target directories
  const foundDirs = findTargetDirectories(parentFolder, targetNames);

  if (foundDirs.length === 0) {
    console.log(`No ${targetDescription} directories found.`);
    process.exit(0);
  }

  console.log(`Found ${foundDirs.length} ${targetDescription} director${foundDirs.length === 1 ? 'y' : 'ies'}:\n`);

  // Calculate and display size for each
  let totalSize = 0;
  const results = [];

  for (const dir of foundDirs) {
    // SAFETY CHECK: For vendor directories, verify autoload.php exists
    if (dir.type === 'vendor') {
      const autoloadPath = path.join(dir.path, 'autoload.php');
      if (!fs.existsSync(autoloadPath)) {
        console.log(`Skipping ${dir.path} - no autoload.php found (not a valid Composer vendor directory)`);
        continue;
      }
    }

    console.log(`Calculating size of: ${dir.path}...`);
    const size = getDirectorySize(dir.path);
    totalSize += size;
    results.push({ path: dir.path, type: dir.type, size });
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESULTS:');
  console.log('='.repeat(80) + '\n');

  // Sort by size (largest first)
  results.sort((a, b) => b.size - a.size);

  for (const result of results) {
    const relativePath = path.relative(parentFolder, result.path);
    const typeLabel = `[${result.type}]`.padEnd(15);
    console.log(`${formatBytes(result.size).padStart(12)} ${typeLabel} - ${relativePath || result.path}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${formatBytes(totalSize)}`);
  console.log('='.repeat(80));

  // Handle clean mode
  if (cleanMode) {
    console.log('\n' + '!'.repeat(80));
    console.log('CLEAN MODE ENABLED');
    console.log('!'.repeat(80));
    console.log(`\nThe following ${results.length} ${targetDescription} director${results.length === 1 ? 'y' : 'ies'} will be PERMANENTLY DELETED:\n`);

    for (const result of results) {
      const relativePath = path.relative(parentFolder, result.path);
      const typeLabel = `[${result.type}]`.padEnd(15);
      console.log(`  ${typeLabel} - ${relativePath || result.path}`);
    }

    console.log(`\nTotal space to be freed: ${formatBytes(totalSize)}\n`);

    const answer = await promptUser(`Are you sure you want to delete ALL these ${targetDescription} directories? (type "yes" to confirm): `);

    if (answer.trim().toLowerCase() === 'yes') {
      console.log(`\nDeleting ${targetDescription} directories...\n`);

      let successCount = 0;
      let failCount = 0;

      for (const result of results) {
        // FINAL SAFETY CHECK: Verify basename is in allowed list
        if (!targetNames.includes(path.basename(result.path))) {
          console.error(`SAFETY CHECK FAILED: Skipping ${result.path} - not an allowed directory type`);
          failCount++;
          continue;
        }

        process.stdout.write(`Deleting: ${result.path}... `);
        const success = deleteDirectory(result.path, targetNames);

        if (success) {
          console.log('✓ DELETED');
          successCount++;
        } else {
          console.log('✗ FAILED');
          failCount++;
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log(`CLEANUP COMPLETE`);
      console.log('='.repeat(80));
      console.log(`Successfully deleted: ${successCount}`);
      console.log(`Failed to delete: ${failCount}`);
      console.log(`Space freed: ${formatBytes(totalSize)}`);
      console.log('='.repeat(80));
    } else {
      console.log('\nCleanup cancelled. No directories were deleted.');
    }
  }
}

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
