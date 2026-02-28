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

## Mixins

Load shared command modules from `~/bin.src/mixins/`:

```ts
await mixins('mobile', 'exodus.link')
```
