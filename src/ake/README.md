# Ake

> A task runner supports shell autocompletion

## Start

Install it

```sh
npm install -g @gutenye/script.js
```

1. Create an ake file

edit `./ake` file, and make it executable `chmod +x ake`

```ts
#!/usr/bin/env bun

import { app, $ } from "@gutenye/script.js";

app.cmd("greetings").add(() => {
  $`echo greetings`;
});

await app.run();
```

2. Run it

```sh
ake greetings   # find the ake file and runs it
```

3. Supports Shell Completion

- Follow [guide](./completions) to setup

```sh
ake <Tab> # uses ake file's completion
```

## Use a template / another location

Create `~/bin.src/ake/template`

```sh
akectl init local  # create a ake file from template in currenct directory
akectl init remote  # create in ~/bin.src/ake/<dir>, doesn't touch original project files
```
