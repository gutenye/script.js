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

## Organize Multiple Files

For larger projects, split commands into separate files and import them.

```sh
project/
├── ake              # entry point (executable)
├── src/commands/cmd1.ts
```

`src/commands/cmd1.ts`

```ts
import { app } from "@gutenye/script.js";

app.cmd("greetings").add(() => {
  $`echo greetings`;
});
```

`ake`

```ts
#!/usr/bin/env bun

import { app } from "@gutenye/script.js";
import "./src/commands/cmd1";

await app.run();
```

## Multiple Ake Files

Any file named `ake<suffix>` or `ake<suffix>.ts` is supported.

1. Create a variant ake file

```sh
akectl init local foo   # creates ./akefoo
```

2. Create a wrapper script so you can invoke it by name

```sh
akectl install-bin ~/bin/ake foo
```

3. Enable shell completion in `ake.fish`

```fish
_setup_ake_complete ake foo
```

4. Run it

```sh
akefoo greetings
akefoo <Tab>   # with autocompletion
```
