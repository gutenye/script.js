# Create Commands

Script.js makes it simple to define commands with arguments, options, and actions using a concise chainable API. Below are the steps and examples to help you get started.

## Basic Example

```ts
app.meta('hello', 'Description')

app.cmd('cmd1 | c', 'Description')       // c is an alias
  .add('<arg1>', 'Description')         // <..> is required
  .add('[arg2]', 'Description')         // [..] is optional
  .add('[arg3=default]', 'Description') // default value
  .add('[...rest]', 'Description')      // variadic

  .add('-b | --boolean', 'Description')
  .add('-s | --string <value>', 'Description')
  .add('-a | --array [values...]', 'Description')

  .add((arg1, arg2, arg3, rest, options, context) => {
    console.log(options) // { boolean: true, string: 'value', array: ['1', '2'] }
    console.log(context.argv) // raw argv for this command
  })
```

## Option with Inline Default

When an option has a default value via `[value=default]`, use `options.$has(key)` to check if the user explicitly provided it on the command line:

```ts
import type { Options } from '@gutenye/script.js'

app.cmd('trade', 'Trade')
  .add('--limit [price=0.1]')
  .add((options: Options<{ limit: string }>) => {
    options.limit         // '0.1' whether or not --limit was passed
    options.$has('limit') // true only if --limit was explicitly passed
  })
```

## Subcommands

```ts
const sub1 = app.cmd('sub1', 'Subcommand group')

sub1.cmd('list', 'List items')
  .add(() => { console.log('listing...') })
```

Invoke with `hello sub1 list`

## Default Command

Define a default command that runs when no command is provided or when an unknown command is given:

```ts
app.cmd()  // no arguments = default command
  .add('[...args]')
  .add((args, context) => {
    console.log('default:', context.argv)
  })
```

## Help

Help is auto-generated. Pass `-h` at any level:

```sh
./hello -h          # app-level help
./hello cmd1 -h     # command-level help
```

Add extra help text:

```ts
app.help(`
Examples:
  hello cmd1 foo
  hello cmd1 --verbose
`)
```

Print help programmatically:

```ts
app.help()  // prints help to stdout
```

## Invoke

Execute a command programmatically:

```ts
// Parse a string as argv
await app.invoke('cmd1 arg1 --verbose')

// Call a command action directly with args
await app.invoke('cmd1', arg1, arg2)
```

## Using Shared Scripts & Node Modules

### Standalone Scripts

For standalone scripts (not inside a project with `package.json`), just `import` any npm package. Bun auto-installs missing dependencies on first run:

```ts
#!/usr/bin/env script.js

import _ from 'lodash-es'
import chalk from 'chalk'

app.cmd('greet', 'Say hello')
  .add('<name>')
  .add((name) => {
    console.log(chalk.green(_.capitalize(name)))
  })
```

No `npm install` needed — Bun resolves and caches the package automatically.

### Shared Scripts

To reuse scripts across multiple commands, use standard `import` with the full path:

```ts
import '/Users/<user>/bin.src/mixins/mobile'
import '/Users/<user>/bin.src/mixins/exodus.link'
```

### Project Scripts

For scripts inside a project directory (with `package.json`), add dependencies as dev dependencies. The script can use all deps in your project:

```sh
npm install --dev chalk
```

```ts
#!/usr/bin/env script.js

import chalk from 'chalk'

app.cmd('build', 'Build project')
  .add(() => {
    console.log(chalk.blue('Building...'))
  })
```

### Node Built-ins

Node built-in modules are always available:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
```
