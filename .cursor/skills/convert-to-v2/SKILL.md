---
name: convert-to-v2
description: Use when the user says "convert" or "convert to v2". Converts any script to script.js v2 format.
---

# Convert to Script.js v2

## Workflow

1. If no file path is provided, ask the user for one.
2. Read the Migration guide at `docs/Migration.md`.
3. Read the target file.
4. Convert the file to script.js v2 format following the rules below.

## Format

Use the `script.js` shebang by default:

```ts
#!/usr/bin/env script.js

const HELP = `
`;

const ENV = process.env;

app.meta("cli-name").help(HELP);

app.cmd("name", "Description").add(() => {
  $`cmd`;
});
```

### Ake files

If the filename is `ake` or starts with `ake`, use the `bun` shebang with explicit imports instead:

```ts
#!/usr/bin/env bun

import { app, $ } from "@gutenye/script.js";

app.cmd("name", "Description").add(() => {
  $`cmd`;
});

await app.run();
```

## Rules

- Put `const HELP` at the top of the file, before any imports.
- Use `const ENV = process.env` for env access
- Group multiple sequential commands into one `$` call:

```ts
$`
  cmd1
  cmd2
`;
```
