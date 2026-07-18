ever get sick and tired of node_modules taking up gigabytes of disk space across many directories

or the vendor folder if you're a php dev

or .venv / venv / __pycache__ if you're a python dev

this script gives you an easy way to clean these up

so, for example:
```bash
  NoModules.js                        # Scan current directory for node_modules
  NoModules.js ~/projects             # Scan ~/projects for node_modules
  NoModules.js --php .                # Scan current directory for vendor directories
  NoModules.js --py .                 # Scan for .venv, venv and __pycache__
  NoModules.js --js --php --py .      # Scan for all supported languages
  NoModules.js --clean ~/projects     # Scan and delete node_modules in ~/projects
```

usage:
```
  Usage: NoModules.js [options] [directory]

  Scan for and optionally delete dependency directories.

  Arguments:
    directory          Directory to scan (default: current working directory)

  Options:
    --js, --javascript Scan for node_modules directories
    --php              Scan for vendor directories (Composer)
    --py, --python     Scan for .venv, venv and __pycache__ directories
    --clean            Delete found directories (with confirmation prompt)
    --help, -h         Show this help message
```

- (c) sleep 2026
