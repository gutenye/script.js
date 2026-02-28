# `$` Shell Template Tag Design

Sync shell execution via tagged template literals, inspired by zx and Bun Shell.

## Requirements

- Sync-only (`Bun.spawnSync`)
- Silent on errors (no throw, check `.exitCode`)
- Chainable per-call config: `.env()`, `.cwd()`, `.quiet()`
- Global defaults: `$.cwd()`, `$.env()`
- Capture methods: `.text()`, `.json()`, `.lines()`
- Interpolation: strings quoted, arrays expanded element-wise

## Approach: Lazy Builder + queueMicrotask

`$` returns a `ShellCommand` builder via Proxy. If no capture method is called synchronously, a microtask fires and runs the command with `stdio: inherit`. If a capture method is called, it executes with `stdout: pipe` instead.

```
$`cmd ${var}` → buildCommand() → new ShellCommand(cmd) → Proxy
                                                           │
                       ┌───────────────────────────────────┴────────────────┐
                       │                                                    │
               .text() / .json() / .lines()                    queueMicrotask fallback
               runs Bun.spawnSync stdout:pipe                  runs Bun.spawnSync stdio:inherit
               returns captured output                         output goes to terminal
```

## API

### Basic usage

```ts
// Runs with stdio inherit (output to terminal)
$`echo hello`

// Capture output
const text = $`echo hello`.text()
const data = $`echo '{"a":1}'`.json()
const list = $`printf "a\nb\nc"`.lines()
const code = $`exit 1`.exitCode
```

### Interpolation

```ts
const name = 'Mike Smith'
const args = ['arg1', 'arg2']

$`echo ${name} ${args}`
// shell sees: echo 'Mike Smith' arg1 arg2
```

- Strings: single-quote escaped when containing special chars
- Arrays: each element escaped individually, joined by space
- Shell syntax (`$(...)`, pipes, redirects) in the template pass through untouched

### Per-call config (chainable)

```ts
$`pwd`.cwd('/tmp').text()           // "/tmp\n"
$`echo $FOO`.env({ FOO: 'bar' }).text()  // "bar\n"
$`echo secret`.quiet()              // suppresses microtask inherit
```

### Global defaults

```ts
$.cwd('/tmp')
$.env({ FOO: 'bar' })

$`pwd`              // prints /tmp
$`echo $FOO`.text() // "bar\n"
```

## ShellCommand class

### Properties

| Member | Type | Description |
|--------|------|-------------|
| `.exitCode` | `number` | Process exit code (triggers piped execution) |

### Config methods (chainable, pre-execution)

| Method | Description |
|--------|-------------|
| `.cwd(path)` | Set working directory |
| `.env(vars)` | Set environment variables |
| `.quiet()` | Suppress the inherit fallback |

### Capture methods (trigger execution)

| Method | Returns | Description |
|--------|---------|-------------|
| `.text()` | `string` | stdout as string |
| `.json()` | `any` | stdout parsed as JSON |
| `.lines()` | `string[]` | stdout split by newline, empty lines filtered |

## Interpolation escaping

`escapeArg(arg)`:
- Empty string → `''`
- Safe chars only (`a-zA-Z0-9._-/=:@`) → pass through
- Otherwise → wrap in single quotes, escape internal `'` as `'\''`

## Trade-offs

- **queueMicrotask ordering**: bare `$`cmd`` output is deferred to the next microtask. Sequential `$` calls interleaved with `console.log` may print in unexpected order. Acceptable for CLI scripting where `$` calls are the main output.
- **No TTY passthrough for capture**: `.text()` etc. use `stdout: pipe`, which may cause programs to suppress colors. Use bare `$`cmd`` for interactive commands.
