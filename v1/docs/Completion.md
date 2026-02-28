# Completion

The autocompletion feature in Script.js allows you to add powerful shell autocompletion for commands, arguments, and options. This makes your CLI tool more intuitive, improving the overall user experience by providing suggestions as users type.

## Basic Example

This example demonstrates how to enable autocompletion for a simple CLI app:

```ts
app
  .name('hello')
  .enableCompletion()

app.command('cmd1')
  .description('Description')

  .argument('[arg1]', 'Description')
  .addArgument(new app.Argument('[arg2]', 'Description').choices(['value1', 'value2']))
  .argument('[args..]', 'Description')

  .option('--option1 <value>', 'Description')
  .option(new app.Option('--option2 [value]', 'Description').choices(['value1', 'value2']))

  .completion({
    positional: [
      ['$files'],  // for `arg1`, complete with file names
      null         // for `arg2`, use choices from above
    ],
    positionalany: ['$files'], // for `args`, complete with file names
    flags: {
      option1: ['value1', 'value2'] // for `--option1`
    },
  })

  .action(() => {
  })
}
```

## Read More

Read more documentation [here](https://carapace-sh.github.io/carapace-spec/carapace-spec.html)