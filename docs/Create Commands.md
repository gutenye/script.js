# Create Commands

Script.js makes it simple to define commands with arguments, options, and actions using a concise chainable API. Below are the steps and examples to help you get started.

## Two Ways to Write Scripts

**Via script.js** — globals are set up automatically, no imports needed:

```ts
#!/usr/bin/env script.js

app.name("hello");

app
  .cmd("greetings", "Say hello")
  .add("[...files]", "Files", ["$files"])
  .add((files, ctx) => {
    $`ls -l ${files}`;
  });
```

**Via import** — use as a library in any Bun script:

```ts
#!/usr/bin/env bun

import { app, $ } from "@gutenye/script.js";

app.name("hello");

app
  .cmd("greetings", "Say hello")
  .add("[...files]", "Files", ["$files"])
  .add((files, ctx) => {
    $`ls -l ${files}`;
  });

await app.run();
```

## Basic Example

```ts
app.name("hello", "Description");

app
  .cmd("greet", "Say hello")
  .add("<name>")
  .add("[title]")
  .add("-u, --uppercase")
  .add((name, title, options, context) => {
    const msg = `Hello, ${title} ${name}!`;
    console.log(options.uppercase ? msg.toUpperCase() : msg);
  });

app.cmd("version", "Show version").add(() => {
  console.log("1.0.0");
});
```

## Arguments

```ts
app
  .cmd("cmd1", "Description")
  .add("<arg1>", "Description") // <..> is required
  .add("[arg2]", "Description") // [..] is optional
  .add("[arg3=default]", "Description") // default value
  .add("[...rest]", "Description") // variadic
  .add((arg1, arg2, arg3, rest, context) => {
    console.log(context.argv); // raw argv for this command
  });
```

## Options

```ts
import type { Options } from "@gutenye/script.js";

app
  .cmd("cmd1", "Description")
  .add("-b, --boolean", "Description")
  .add("-s, --string <value>", "Description")
  .add("-a, --array [values...]", "Description")
  .add("--no-seeds", "Skip seeds") // negate: options.seeds is true by default, false when passed
  .add("--limit [price=0.1]") // inline default
  .add((options: Options) => {
    options.boolean; // true
    options.string; // 'value'
    options.array; // ['1', '2']
    options.seeds; // true by default, false when --no-seeds is passed
    options.limit; // '0.1' whether or not --limit was passed
    options.$has("limit"); // true only if --limit was explicitly passed
  });
```

## Subcommands

A command can have both its own action and subcommands. The action runs when no subcommand matches:

```ts
app.cmd("sub1 list", "List items");

app
  .cmd("a, ask", "Ask something")
  .add("<question>")
  .add((question) => {
    console.log(`Asking: ${question}`);
  });
app.cmd("ask history", "Show question history");
app.cmd("ask clear", "Clear saved answers");
```

```sh
./hello sub1 list         # runs sub1 list subcommand
./hello ask "what time"   # runs ask action
./hello ask history       # runs ask history subcommand
```

## Aliases

Add a short alias with a comma-separated name. The shortest name is the alias, the longest is the command name. For subcommands with spaces, the alias works as a top-level shortcut:

```ts
app.cmd("c, cmd1", "Description");
app.cmd("wd, web dev", "Start web dev server");
```

```sh
./hello cmd1       # full name
./hello c          # alias
./hello web dev    # subcommand path
./hello wd         # top-level shortcut
```

## Default Command

`app.cmd()` with no name defines a default command. It runs when no command is provided, or as a catch-all when no named command matches:

```ts
app.cmd("build", "Build project");
app.cmd("test", "Run tests");
app
  .cmd()
  .add("[target]", "Deploy target")
  .add((target, context) => {
    console.log("default:", target, context.argv);
  });
```

```sh
./hello build       # runs build command
./hello staging     # no match → runs default command
./hello             # runs default command
```

## Hidden Commands

`app.cmdHide()` works like `app.cmd()` but hides the command from help output and completions. The command is still executable:

```ts
app.cmdHide("debug", "Internal debug tool").add(() => {
  console.log("debugging...");
});
```

```sh
./hello -h          # "debug" won't appear in help
./hello debug       # still works
```

## Help

Help is auto-generated. Pass `-h` at any level. Add extra help text with `app.help(text)`, or print help programmatically with `app.help()`:

```ts
app.help(`
Examples:
  hello cmd1 foo
  hello cmd1 --verbose
`);
app.help(); // prints help to stdout
```

```sh
./hello -h          # app-level help
./hello cmd1 -h     # command-level help
```

## Invoke

Execute a command programmatically:

```ts
await app.invoke("cmd1 arg1 --verbose"); // parse a string as argv
await app.invoke("cmd1", arg1, arg2); // call action directly with args
```

## Using Shared Scripts & Node Modules

### Standalone Scripts

For standalone scripts (not inside a project with `package.json`), just `import` any npm package. Bun auto-installs missing dependencies on first run:

```ts
#!/usr/bin/env script.js

import _ from "lodash-es";
import chalk from "chalk";

app
  .cmd("greet", "Say hello")
  .add("<name>")
  .add((name) => {
    console.log(chalk.green(_.capitalize(name)));
  });
```

No `npm install` needed — Bun resolves and caches the package automatically.

### Shared Scripts

To reuse scripts across multiple commands, use standard `import` with the full path:

```ts
import "/Users/<user>/bin.src/mixins/mobile";
import "/Users/<user>/bin.src/mixins/exodus.link";
```

### Project Scripts

For scripts inside a project directory (with `package.json`), add dependencies as dev dependencies. The script can use all deps in your project:

```ts
#!/usr/bin/env script.js

// npm install --dev chalk
import chalk from "chalk";

app.cmd("build", "Build project").add(() => {
  console.log(chalk.blue("Building..."));
});
```

### Node Built-ins

Node built-in modules are always available:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
```
