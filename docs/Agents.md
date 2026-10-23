# Agents

Script.js tools work well for AI agents and other programs: results arrive as JSON, errors carry stable codes, help is machine-readable, and any script can serve its commands as MCP tools.

## Structured Output

Call `app.json()` once. A handler then **returns** its result instead of printing it:

```ts
app.name("exodusctl");
app.json();
app.global("-d, --device [name]", "Simulator name or UDID");

app.cmd("state", "Show the screen").add(async (options) => {
  return { route: "PayHome", device: options.device ?? null };
});
```

```sh
exodusctl state --json          # {"route":"PayHome","device":null}
exodusctl state | jq .route     # piped output is JSON without --json
exodusctl state                 # on a terminal: indented JSON, strings as is
```

- **`--json`** is added to every command. JSON is also the default whenever stdout is not a terminal.
- **Nothing is printed** when the handler returns `undefined`, so a handler can still print its own output.
- **`context.json`** tells the handler which format is being printed, for example to skip a progress line.
- Shell output from `$` still goes to stdout, ahead of the result line.

Apps that don't call `app.json()` behave as before: what a handler returns is ignored. Many one-line handlers, such as `` () => $`yarn test` ``, return a value without meaning it as output.

## Errors and Exit Codes

In a structured app, a thrown error prints on stderr and sets the exit code:

```ts
import { CommandError } from "@gutenye/script.js";

throw new CommandError("No booted simulator", {
  code: "no_device",
  exitCode: 1,
  data: { booted: [] },
});
```

```json
{ "error": { "code": "no_device", "message": "No booted simulator", "data": { "booted": [] } } }
```

- A plain `Error` works too. Its `code` property is used when it is a string, otherwise the code is `error`.
- A failed `$` command reports `shell_failed` with the command's exit code.
- A timed-out action reports `timeout`.

| Exit code | Meaning |
| --- | --- |
| `0` | Success |
| `1`, or the error's `exitCode` | The command ran and failed |
| `2` | Usage error: unknown command or option, bad value, missing argument. Nothing ran |

Usage errors go to stderr in every app, message first, so stdout never carries help text:

```text
Unknown option: --dry-rn (did you mean --dry-run?)

Usage: exodusctl send <asset> <amount> <to>
Run 'exodusctl send -h' for help.
```

In a structured app with JSON output, the same error is `{"error":{"code":"usage","message":"…","data":{"usage":"…","help":"exodusctl send -h"}}}`.

## Machine-Readable Help

`--help --json`, or `-h --json`, prints the command tree in one call, at any level:

```sh
exodusctl --help --json        # every command
exodusctl send -h --json       # one command
```

Each command lists its `path`, `usage`, `description`, `arguments` (name, type, required, variadic, default, choices), `options` (name, flags, value kind, type, default, choices, whether it is `global`), `examples` and `commands`. `passThrough: true` marks a command that declares nothing and forwards its arguments.

## Examples

```ts
app
  .cmd("o, open", "Open a screen")
  .add("<screen>")
  .example("exodusctl open PayHome -t 5000", "Open Pay and wait up to 5s");
```

Examples appear under `Examples:` in `-h`, in `--help --json`, and in MCP tool descriptions.

## Timeouts

```ts
app.timeout(60_000); // every command
app.cmd("swap").timeout(120_000); // the nearest limit wins
```

An action that runs longer fails with `<path> timed out after <ms>ms` (code `timeout`). Use `` $`cmd`.timeout(ms) `` to bound a single shell command.

## MCP Server

Every script can serve its commands as MCP tools over stdio:

```sh
exodusctl --mcp
```

```json
{ "mcpServers": { "exodusctl": { "command": "exodusctl", "args": ["--mcp"] } } }
```

- **One tool per runnable command**, named by its path: `wallet send` becomes `wallet_send`. Hidden commands and default commands are left out.
- **The input schema comes from the declarations.** Arguments and options become properties, `<required>` arguments and `<value>` options are required, `:number` becomes `number`, `:json` accepts any JSON, variadic values become arrays, and choices become `enum`. A command that declares nothing takes an `argv` string array.
- **A tool call runs the normal parser**, with flags first and positionals after `--`, so a value such as `-h` is never read as a flag.
- **The result** is the handler's return value as text, plus `structuredContent` when it is an object. Anything the call printed, including `$` output, follows as a second text item. A thrown error, `process.exit` with a non-zero code, or a usage error sets `isError`.
- **The protocol stream stays clean.** During a call, `console.*`, `process.stdout.write` and `$` output are captured, `$` commands get no stdin, and `process.exit` ends only the call.
- Calls run one at a time.
