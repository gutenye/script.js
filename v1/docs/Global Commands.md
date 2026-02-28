# Global Commands

Script.js provides a powerful set of global commands, making it easier to execute shell commands, work with the filesystem, handle environment variables, and more—using the simplicity and power of JavaScript.

## $

Run shell commands directly from your script using the $ command.

```ts
$`cmd`   // Execute shell command
$t`cmd`  // Execute shell command, return result as a string
$l`cmd`  // Execute shell command, return output as an array of lines
```

## Global variables

Script.js provides the following built-in global variables to simplify working with your environment:

```ts
HOME     // The home directory of the user
CWD      // The current working directory
ENV      // A collection of environment variables
```

## Filesystem Operations

Script.js makes filesystem manipulation easy and intuitive. It supports common file operations and provides automatic handling for missing directories and globbing.

- Supports `~/path` for home directory expansion.
- Supports globbing for file patterns.
- Automatically ignores missing directories and creates missing directories.

```ts
cp(source, dest)
mv(source, dest)
rm(dir)
mkdir(dir)
ls(dir)   // e.g. ls('~/*.txt')
```

## Utilities

Script.js provides lodash utils.

```ts
_    // lodash object
```

## UI functions

Script.js makes it easy to present data in a tabular format or apply text formatting using the ui module.

```ts
ui.table(data)         // Print data in a formatted table
colors.red.bold(text)  // Provides simple text styling   
```

## CSV

Script.js also includes utilities for handling CSV data.

```ts
csv.parse(text) // Parse CSV string into an array of objects
```
