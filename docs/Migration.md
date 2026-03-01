# Migration from v1 to v2

v2 is a complete rewrite from scratch. It removes heavy dependencies like `commander`, `zx`, `lodash-es`, `chalk`, `csv-parse`, `table`, and `tiny-invariant` — replacing them with a lightweight, custom-built CLI framework that only depends on `yaml`.

The goal is a cleaner syntax, the smallest set of global variables, and using vanilla JavaScript as much as possible. You should be able to write scripts quickly without looking up documentation — if you know JavaScript, you know the API. Features like `process.env`, `process.platform`, `node:fs/promises`, and template literal `$` are standard JavaScript/Bun patterns, not library-specific abstractions.

**What's new:**
- Unified `.add()` method for arguments, options, and actions — one method does it all
- `app.cmd()` for defining commands with inline aliases (`app.cmd('build | b', 'Build')`)
- Built-in argument validation with choices, required option checks, and auto-generated help
- Default commands, recursive subcommands, `invoke()` for programmatic execution
- `-h` flag support at every level (app and subcommand)

**What's removed:**
- No more global `HOME`, `CWD`, `ENV`, `_`, `colors`, `ui`, `csv`, `yaml`, `fs`, `exitWithError` — use standard JavaScript instead
- No more `$t`, `$l` variants — use `$\`cmd\`.text()`, `$\`cmd\`.lines()` on the unified `$`
- No more `actionMac`/`actionLin`/`actionWin` — use `process.platform` in your action

## Global Variables

```ts
// v1
HOME
CWD
ENV.MY_VAR

// v2
const { HOME, PWD } = process.env
const ENV = process.env
```

## Shell Commands

```ts
// v1
await $`cmd`
await $t`cmd`
await $l`cmd`

// v2
$`cmd`
$`cmd`.text()
$`cmd`.lines()
```

## Commands

```ts
// v1
app.name('hello').description('Description')
app.command('cmd1').alias('c').description('Description')
  .argument('<arg>', 'Description')
  .option('-v, --verbose', 'Description')
  .action((arg, options) => {})

// v2
app.meta('hello', 'Description')

app.cmd('cmd1 | c', 'Description')
  .add('<arg>', 'Description')
  .add('-v | --verbose', 'Description')
  .add((arg, options, context) => {})
```

## Help Text

```ts
// v1
app.addHelpText('after', HELP)

// v2
app.help(HELP)
```

## Default Command

```ts
// v1
app.command('default [args..]', { isDefault: true, hidden: true })
  .allowUnknownOption()
  .action(() => { console.log(app.rawArgs) })

// v2
app.cmd().add(({ argv }) => {
  if (argv.length === 0) {
    return app.help()
  }
})
```

## Error Handling

```ts
// v1
exitWithError('message', help)

// v2 — inline, no global helper
console.error('Error: message')
if (help) console.log(`\n${help}`)
process.exit(1)
```

## Platform-Specific Actions

```ts
// v1
app.command('cmd1')
  .actionMac(() => {})
  .actionLin(() => {})

// v2 — check platform in the action
app.cmd('cmd1')
  .add(() => {
    if (process.platform === 'darwin') { /* mac */ }
    if (process.platform === 'linux') { /* linux */ }
  })
```

## File System

```ts
// v1
ls('~/*.txt')
cp(source, dest)
mv(source, dest)
rm(dir)
mkdir(dir)

// v2 — use globby + node:fs
import fs from 'node:fs/promises'
import { globby } from 'globby'
const files = await globby(['~/*.txt'])
await fs.cp(source, dest)
await fs.rename(source, dest)
await fs.rm(dir, { recursive: true })
await fs.mkdir(dir, { recursive: true })
```

## Mixins

```ts
// v1
await mixins('mobile', 'exodus.link')

// v2 — use standard imports with full paths
import '/Users/<user>/bin.src/mixins/mobile'
import '/Users/<user>/bin.src/mixins/exodus.link'
```

The `mixins()` global is removed. Use standard `import` with the full path instead. This is simpler, gives you IDE autocomplete and type checking, and follows standard JavaScript conventions.

## Removed Globals

The following v1 globals are removed in v2. Use npm packages directly:

| v1 Global | v2 Replacement |
|-----------|---------------|
| `_` (lodash) | `import _ from 'lodash-es'` |
| `colors` (chalk) | `import colors from 'chalk'` |
| `ui.table()` | import a table library |
| `csv.parse()` | import a csv library |
| `yaml` | `import * as yaml from 'yaml'` |
| `fs`, `nodePath` | `import fs from 'node:fs/promises'` |
| `$t`, `$l` | `$\`cmd\`.text()`, `$\`cmd\`.lines()` |
| `exitWithError` | inline `console.error` + `process.exit(1)` |
| `mixins()` | `import '/full/path/to/mixin'` |

## New in v2

| Feature | Example |
|---------|---------|
| `app.cmd()` with aliases | `app.cmd('build \| b', 'Build')` |
| `.add()` unified API | `.add('<arg>')`, `.add('-v \| --verbose')`, `.add(fn)` |
| Default command | `app.cmd().add((ctx) => {})` |
| Argument validation | `.add('<platform>', 'Platform', ['ios', 'android'])` |
| `invoke()` | `await app.invoke('build production')` |
| Recursive subcommands | `app.cmd('build').cmd('xcode', 'Xcode')` |
| `-h` flag | `./app -h`, `./app cmd -h` |
