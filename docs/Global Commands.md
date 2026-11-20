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
$`cmd`.timeout(5000)              // kill with SIGTERM after 5s; fails as "timed out after 5000ms"
```

Commands check that the configured working directory exists before spawning. A missing directory or a file used as `.cwd()` reports `Working directory is missing or not a directory: <path>`, including when the directory comes from `$.cwd()`.

### Running in Parallel

An awaited command runs without blocking, so `Promise.all` runs several at once. Un-awaited commands and `.text()`, `.lines()` and `.json()` stay synchronous, so plain sequential scripts keep their order:

```ts
await Promise.all([$`bun run build`, $`bun run lint`]) // both at once

$`echo first`                     // runs before the next line
$`echo second`
```

### Long-running Processes

`.spawn()` starts the command and returns the running [`Bun.Subprocess`](https://bun.sh/docs/api/spawn) at once, instead of waiting for it to finish. It honours `.cwd()`, `.env()`, `$.cwd()`, `$.env()` and `$.global`; stdin is ignored and stdout/stderr go to the terminal:

```ts
const server = $`bun run dev`.spawn()
server.kill()                     // stop it
const code = await server.exited  // resolves with the exit code

$`cmd`.spawn({ stdout: 'pipe' })  // read output from proc.stdout (a ReadableStream)
$`cmd`.timeout(5000).spawn()      // killed with SIGTERM after 5s
```

`.nothrow()` has no effect on a spawned process: it never throws, so check `await proc.exited` yourself.

### Ignoring Failures

By default a failed command throws (or exits the script). Use `.nothrow()` to keep going:

```ts
const { exitCode } = await $`cmd`.nothrow()
if (exitCode !== 0) {
  // handle the failure
}

$`cmd`.nothrow().text()           // returns stdout even on failure
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
app          // Command instance for defining CLI metadata and commands
$            // Shell command tagged template
PROJECT_DIR  // ake only: absolute path to the project dir (where the ake file lives)
```
