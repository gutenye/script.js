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

A variadic option collects values until the next flag, and repeating it appends: `-a 1 2 -a 3` gives `['1', '2', '3']`. Short flags can be bundled: `-nv` is `-n -v`, and only the last one may take a value.

## Typed Values

Add `:number` or `:json` to a placeholder to convert the value, defaults included. An invalid value prints help and exits 1:

```ts
app
  .cmd("open", "Open a screen")
  .add("<screen>")
  .add("[params:json]", "Route params") // '{"a":1}' → { a: 1 }
  .add("-t, --timeout [ms:number=10000]", "Wait timeout") // '250' → 250, default 10000
  .add((screen, params, options) => {
    options.timeout; // a number
  });
```

## Shared Options

Put a group of arguments or options used by several commands in a function, and apply it with `.use()`. The group lands where `.use()` sits, and a factory takes parameters:

```ts
const targetOptions = (command) =>
  command
    .add("-d, --device [name]", "Simulator name or UDID")
    .add("-p, --port [port:number]", "Metro port");

const waitOptions =
  ({ timeout = 10000 } = {}) =>
  (command) =>
    command.add(`-t, --timeout [ms:number=${timeout}]`, "Wait timeout");

app
  .cmd("open", "Open a screen")
  .add("<screen>")
  .use(targetOptions, waitOptions())
  .add((screen, options) => {});
```

## Global Options

`.global()` declares an option that a command and all its subcommands accept, before or after the command name. Help lists it under `Global Options:`, and completion offers it on every subcommand:

```ts
app.global("-d, --device [name]", "Simulator name or UDID");

app.cmd("state", "Show the screen").add((options) => {
  options.device;
});
```

```sh
./appctl state -d iPhone
./appctl -d iPhone state
```

- A command that declares none of its own options still receives `options` once it inherits a global one.
- A command's own option replaces a global one that shares its name or a flag.
- An optional global value never takes a command name: `./appctl -d state` sets `device` to `true`.

## Strict Parsing

A command that declares any argument or option, its own or inherited, rejects mistakes instead of running with them: an unknown option (with a "did you mean" hint), an extra positional, or a value on a boolean flag. The error, the usage line and a `-h` hint go to stderr, and the script exits 2, as it does for an unknown command. `-h` and `--help` print help anywhere before `--`; add `--json` for the machine-readable tree (see [Agents](./Agents.md)).

A command that declares nothing forwards its input untouched, so wrappers keep working:

```ts
app.cmd("t", "Run tests").add(({ argv }) => {
  $`bun test ${argv}`; // ake t --watch src/foo.test.ts
});
```

Everything after `--` is positional, including flags.

## Types

In TypeScript, the handler's parameters are inferred from the `add()` strings: `<amount:number>` is a `number`, `[account]` is `string | undefined`, `[...assets]` is `string[]`, and `-n, --dry-run` adds `options.dryRun?: boolean`. A command without its own options leaves the parameters after its arguments untyped, because an inherited global option may add `options` there.

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

Help lists only first-level commands, so a large tree stays readable. A parent with subcommands shows as `sub1 <command>`; run `./hello sub1 -h` to list its subcommands.

```sh
./hello -h        # sub1 <command>, a, ask <question>
./hello sub1 -h   # list
```

## Help Sections

Use `app.section(name)` to group the commands declared after it under a heading in help output:

```ts
app.section("Development");
app.cmd("dev", "Start development server");
app.cmd("test", "Run tests");

app.section("Release");
app.cmd("build", "Build the app");
app.cmd("deploy", "Deploy the app");
```

```text
Commands:

(Development)
  dev     Start development server
  test    Run tests

(Release)
  build   Build the app
  deploy  Deploy the app
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
