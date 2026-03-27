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

Scope a preamble to commands with a specific `.cwd()`:

```ts
$.global`source .env`.cwd('server')

$`echo $DB_HOST`.cwd('server')   // .env is sourced (preamble applies)
$`echo $DB_HOST`                  // .env is NOT sourced
```

Preambles are applied in declaration order. Unscoped preambles apply to all commands, scoped ones only to matching cwd:

```ts
$.global`A=1`
$.global`B=2`.cwd('server')
$.global`C=3`

$`cmd`.cwd('server')              // preamble: A=1, B=2, C=3
$`cmd`                            // preamble: A=1, C=3
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
