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

### Global Shell Preamble

Define shell aliases, functions, or variables that are prepended to every `$` command:

```ts
$.global`
alias gp="git push"
e() { echo hello "$@"; }
`

$`e world`                        // prints: hello world
$`gp`                             // runs: git push
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
$        // Shell command tagged template
```
