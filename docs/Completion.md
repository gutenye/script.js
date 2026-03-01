# Completion

The autocompletion feature in Script.js allows you to add powerful shell autocompletion for commands, arguments, and options. This makes your CLI tool more intuitive, improving the overall user experience by providing suggestions as users type.


## Basic Example

```ts
app.meta('hello')

app.cmd('cmd1', 'Description')
  .add('[arg1]', 'Description', ['value1', 'value2'])  // complete with choices
  .add('[arg2]', 'Description', ['$files'])             // complete with file names
  .add('[...rest]', 'Description', ['$files'])           // variadic, complete with file names

  .add('--option1 <value>', 'Description', ['value1', 'value2'])
  .add('--option2 [value]', 'Description', ['value1', 'value2'])
```

Completion values are passed as the third argument to `.add()`:
- **String array**: static choices (e.g., `['ios', 'android']`)
- **Function**: dynamic choices (e.g., `() => ['a', 'b']`)
- **Macros**: special values like `$files` for file completion

## How It Works

On each run, Script.js automatically generates a Carapace spec YAML file based on your command definitions and writes it to the Carapace specs directory:

- **macOS**: `~/Library/Application Support/carapace/specs/`
- **Linux**: `~/.config/carapace/specs/`
- **Windows**: `%LOCALAPPDATA%/carapace/specs/`

The spec file is only written when it has changed, so there's no overhead on repeated runs.

## Macros

Use Carapace macros for built-in completions:

```ts
.a('[file]', 'File', ['$files'])           // file names
.a('[dir]', 'Directory', ['$directories']) // directory names
```

## Read More

Read more documentation [here](https://carapace-sh.github.io/carapace-spec/carapace-spec.html)
