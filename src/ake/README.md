# Ake

> A task runner supports shell autocompletion

## Start

1. Create an ake file

edit `./ake` file, and make it executable `chmod +x ake`

```ts
#!/usr/bin/env script.js

app.enableAkeCompletion()

app.command('greetings')
  action(() => {
    console.log('greetings')
  })
```

2. Run it

```sh
a greetings   # find the ake file and runs it
```

3. Supports Shell Completion 

- Follow [guide](./completions) to setup

```sh
a <Tab> # uses ake file's completion
```

## Use a template

Create `~/bin.src/ake/template`

## Put ake file in another location

Doesn't touch original project files

```sh
akectl init remote # create in ~/bin.src/ake/<dir>
```
