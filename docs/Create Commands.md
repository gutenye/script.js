# Create Commands

Script.js makes it simple to define commands and their corresponding arguments, options, and actions. Whether you’re building simple commands or platform-specific behaviors, Script.js provides flexibility and ease of use. Below are the steps and examples to help you get started.

## Basic Example

This example demonstrates how to define a basic command with required and optional arguments, flags, and actions:

```ts
app.name('hello')
  .description('Description')

app.command('cmd1')  
  .alias('c')        // Alias for the command
  .description('Description')

  .argument('<arg1>', 'Description') // <..> is required
  .argument('[arg3]', 'Description', 'defaultValue') // [..] is optional

  .option('-b, --boolean', 'Description')
  .option('-s, --string [value]', 'Description', 'defaultValue')
  .option('-a, --array [values...]', 'Description', ['defaultValue']) // -a 1 2 3

  .action((arg1, arg2, arg3, options) => {
    console.log(options)
  })
```

## Platform-Specific Actions

In some cases, you may want to run different actions based on the user’s operating system.

```ts
app.command('cmd1')
  .actionLin(() => { 
    console.log('This runs only on Linux!')
  })
  .actionMac(() => {
    console.log('This runs only on macOS!')
  })
  .actionWin(() => {
    console.log('This runs only on Windows!');
  })
```

## Default command

Sometimes, you may want to define a default command that runs when no specific command is provided, or handle unknown options.

```ts
app
  .command('default [args..]', { isDefault: true, hidden: true })
  .allowUnknownOption()
  .action(() => {
    console.log(app.rawArgs)
  })
```

## Read More

Read more documetation [here](https://github.com/tj/commander.js#readme)