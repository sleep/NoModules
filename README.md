ever get sick and tired of node_modules taking up gigabytes of disk space across many directories

or the vendor folder if you're a php dev

this script gives you an easy way to clean these up

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

so, for example:
```bash
# list all node_modules directories and subdirectories in ~/project and their size
node NoModules.js --modules ~/project

# list and remove all node_modules and vendor directories/subdirectories inside ~/project
node NoModules.js --modules --vendor --clean
```

- (c) sleep 2026
