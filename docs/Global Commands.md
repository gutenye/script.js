# Global Commands

Script.js provides a set of global commands, making it easier to execute shell commands and work with files using the simplicity and power of JavaScript.

## $

Run shell commands directly from your script using the `$` tagged template:

```ts
$`echo hello`                     // inherit stdio (prints to terminal)
$`echo hello`.text()              // returns stdout as string
$`echo hello`.lines()             // returns stdout as string[]
$`echo '{"a":1}'`.json()          // returns parsed JSON
```

### Chaining

```ts
$`cmd`.cwd('/tmp').text()         // run in specific directory
$`cmd`.env({ KEY: 'val' }).text() // run with env vars
```

### Global Defaults

```ts
$.cwd('/tmp')                     // set default cwd for all commands
$.env({ KEY: 'val' })             // set default env for all commands
```

### Interpolation

Values are automatically shell-escaped:

```ts
const file = 'my file.txt'
$`cat ${file}`                    // cat 'my file.txt'

const files = ['a.txt', 'b.txt']
$`cat ${files}`                   // cat a.txt b.txt
```

## Global Variables

```ts
app      // Command instance for defining CLI metadata and commands
cmd      // Shorthand for app.cmd()
globby   // Glob matching via the globby package
$        // Shell command tagged template
```

## globby

Find files using glob patterns:

```ts
const files = await globby(['src/**/*.ts', '!**/*.test.ts'])
```
