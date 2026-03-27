ever get sick and tired of node_modules taking up gigabytes of disk space across many directories

or the vendor folder if you're a php dev

this script gives you an easy way to clean these up

so, for example:
```bash
  NoModules.js                        # Scan current directory for node_modules
  NoModules.js ~/projects             # Scan ~/projects for node_modules
  NoModules.js --vendor .             # Scan current directory for vendor directories
  NoModules.js --modules --vendor .   # Scan for both node_modules and vendor
  NoModules.js --clean ~/projects     # Scan and delete node_modules in ~/projects
```

usage:
```
  Usage: NoModules.js [options] [directory]

  Scan for and optionally delete node_modules and vendor directories.

  Arguments:
    directory          Directory to scan (default: current working directory)

  Options:
    --modules          Scan for node_modules directories
    --vendor           Scan for vendor directories (Composer)
    --clean            Delete found directories (with confirmation prompt)
    --help, -h         Show this help message
```

- (c) sleep 2026
