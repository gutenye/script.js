# script.js

> Write shell scripts in JavaScript

NOTE: KEEP THIS PRIVATE: contains private scripts, for code format, types, code completion

## Install

```
npm install -g @gutenye/script.js
```

## Write a script

```ts
#!/usr/bin/env gutenye-script.js

app.name('hello')

app.command('list [files...]')
  .action((files, options) => {
    ..
  })
```

## Completion

```
app.name('cli')

app.command('cmd1 <file>')
  .description('<file> Description')
  .option('--string <string>', '<string> Descripton')
  .completion({
    // they are saved to carapace spec
    completion: {
      flags: {
        option: ['value1']
      },
      positional: [
        null    // use null to skip ovewrite
        ['$files']
      ],
      positionalany: [],
    }
  }
}
```