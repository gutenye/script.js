# script.js

> Write shell scripts in JavaScript

NOTE: KEEP THIS PRIVATE: contains private scripts, has types

TODO
  - auto install completion
    - when run by each time
    - prevent overwite: check a.spec contains comment "DO NOT EDIT, AUTO GENERATED BY @gutenye/commander-to-carapace'
    - no not write if they are same

## Install

```sh
ln -s (full_path)/src/index.js /usr/local/bin/scriptin.js
```

## Write a script

```ts
#!/usr/bin/env scriptin.js

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
  .complete({
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