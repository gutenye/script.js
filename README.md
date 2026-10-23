# Script.js

**Write CLI tools and shell scripts in JavaScript, for humans and agents.** A few lines give you a command with subcommands, typed arguments, help and validation. People get tab completion and readable output; AI agents get JSON results, errors with stable codes, the whole command tree in one call, and an MCP server, from the same script. If you know JavaScript, you know the API.

**Show your ❤️ and support by starring this project and following the author, [Guten Ye](https://github.com/gutenye)!**

[![Stars](https://img.shields.io/github/stars/gutenye/script.js?style=social)](https://github.com/gutenye/script.js) [![NPM Version](https://img.shields.io/npm/v/@gutenye/script.js)](https://www.npmjs.com/package/@gutenye/script.js) [![License](https://img.shields.io/github/license/gutenye/script.js?color=blue)](https://github.com/gutenye/script.js/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)](https://github.com/gutenye/script.js#contribute)

## Features

### For everyone

- **Fast to write**: no imports in a `script.js` script. Open the editor, write a few lines, and run it.
- **Commands that check their input**: subcommands, aliases, options shared across commands, `:number` and `:json` values, and choices. A typo such as `--dry-rn` stops with "did you mean `--dry-run`?" instead of running.
- **Shell commands made easy**: `` $`git status` `` with safe escaping, `.text()` and `.json()` to capture output, `Promise.all` to run in parallel, and `.timeout()`.
- **Fast**: runs on Bun, so a call starts in milliseconds.
- **Typed in TypeScript**: handler parameters are inferred from the `add()` strings.

### For humans

- **Tab completion** in every shell through [Carapace](https://github.com/carapace-sh/carapace-bin), generated from your commands.
- **Readable help** with examples, from `-h` at any level.
- **Ake**: a per-project task runner with completion.

### For agents

- **JSON results**: with `app.json()`, a handler returns its result, printed as JSON with `--json` or whenever output is piped.
- **Errors an agent can branch on**: `{"error":{"code","message"}}` on stderr. Usage errors exit 2, so they're never mistaken for a failed operation.
- **The whole tool in one call**: `--help --json` prints every command with its arguments, options, types, defaults, choices and examples.
- **An MCP server for free**: `<script> --mcp` serves every command as an MCP tool, with input schemas built from your declarations.

## Getting Started

### 1. Install

First, make sure [Bun](https://bun.sh) and [Carapace](https://github.com/carapace-sh/carapace-bin) are installed.

```sh
npm install -g @gutenye/script.js
```

### 2. Write Your First Script

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

### 3. Run the script

You can use `<Tab>` to autocomplete arguments or options while using the script.

```sh
chmod +x hello         # Make the script executable
./hello                # First run to create completion file
./hello <Tab>          # Use Tab key for autocompletion
```

### 4. Make it agent-ready

Turn on structured output, return results, and throw errors with a code:

```ts
#!/usr/bin/env script.js

app.name("weather");
app.json();

app
  .cmd("now", "Current weather for a city")
  .add("<city>", "City name")
  .add("-u, --units [units=metric]", "Units", ["metric", "imperial"])
  .example("weather now Paris -u imperial", "Paris in Fahrenheit")
  .add(async (city, options) => {
    const response = await fetch(`https://example.com/weather?city=${encodeURIComponent(city)}`);
    if (!response.ok) throw Object.assign(new Error(`No weather for ${city}`), { code: "not_found" });
    return { city, units: options.units, ...(await response.json()) };
  });
```

```sh
./weather now Paris              # readable on a terminal
./weather now Paris | jq .city   # JSON when piped
./weather --help --json          # the command tree, for an agent to read
./weather --mcp                  # serve it as MCP tools
```

Add it to an MCP client:

```json
{ "mcpServers": { "weather": { "command": "/path/to/weather", "args": ["--mcp"] } } }
```

See [Agents](./docs/Agents.md) for exit codes, error shapes and how tool calls map to arguments.

## Documentation

- [Create Commands](./docs/Create%20Commands.md): Create commands, subcommands, and manage dependencies
- [Completion](./docs/Completion.md): Customize the autocompletion
- [Global Commands](./docs/Global%20Commands.md): List of global variables and commands
- [Helpers](./docs/Helpers.md): Utility functions for writing scripts
- [Ake](./docs/Ake.md): A task runner supports shell autocompletion
- [Agents](./docs/Agents.md): JSON results and errors, machine-readable help, and serving a script as an MCP server

## v2

v2 is a complete rewrite from scratch. It removes heavy dependencies, replacing them with a lightweight, custom-built CLI framework. A cleaner syntax, the smallest set of global variables, and using vanilla JavaScript as much as possible. You should be able to write scripts quickly without looking up documentation — if you know JavaScript, you know the API.

See [Migration from v1](./docs/Migration.md) for a full migration guide.

Looking for v1 documentation [here](https://github.com/gutenye/script.js/tree/v1)

## Thanks

- [Bun](https://github.com/oven-sh/bun): Incredibly fast JavaScript runtime, bundler, test runner, and package manager
- [Carapace](https://github.com/carapace-sh/carapace-bin): A multi-shell completion binary

## Contribute

We love contributions! Whether you're fixing bugs, adding features, or improving documentation, your involvement makes this project better.

1. Fork the Repository
2. Open a Pull Request on Github

---

Thank you for using Script.js! If you found it helpful, please ⭐️ star the project ️️⭐ on GitHub. If you have any questions, encounter issues, please refer to the documentation or report an issue on GitHub.

**Special Thanks to All Contributors:**

[![](https://contrib.rocks/image?repo=gutenye/script.js)](https://github.com/gutenye/script.js/graphs/contributors)

[⬆ Back to top ⬆](#readme)
