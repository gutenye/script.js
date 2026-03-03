# Ake

> A task runner supports shell autocompletion

## Start

Install it

```sh
npm install -g @gutenye/script.js
```

1. Create an ake file

Create a `./ake` file, and make it executable `chmod +x ake`

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

## Multiple Ake Files

You can have multiple ake files in the same directory, each for different tasks. Any file named `ake<suffix>` or `ake<suffix>.ts` is supported.

```sh
# Create variant ake files
akectl init local foo   # creates ./akefoo
akectl init local bar   # creates ./akebar

# Create symlinks so you can invoke them by name
ln -sf $(which ake) ~/bin/akefoo
ln -sf $(which ake) ~/bin/akebar

# Run them
akefoo greetings   # finds ./akefoo and runs it
akebar deploy      # finds ./akebar and runs it
```

Each variant gets its own shell completion spec automatically.

## Use a template / another location

Create `~/bin.src/ake/template`

```sh
akectl init local         # create an ake file from template in current directory
akectl init local foo     # create an akefoo file
akectl init remote        # create in ~/bin.src/ake/<dir>, doesn't touch original project files
akectl init remote foo    # create akefoo in remote location
akectl edit               # opens an editor to edit the ake file
akectl edit foo           # opens an editor to edit the akefoo file
```
