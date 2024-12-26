# Completion

```ts
app
	.name('hello')
	.enableCompletion()

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

app.installCompletion()
```