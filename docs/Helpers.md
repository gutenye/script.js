# Helpers

Utility functions for writing scripts.

## app.format

Format data as a string without printing it. Available on the existing `app`, including in `#!/usr/bin/env script.js` scripts; no separate formatter import is needed:

```ts
import { app } from '@gutenye/script.js'

const { format } = app

console.log(format.table([
  { Name: 'dev', Path: '~/dev' },
  { Name: 'Cloud', Path: '~/Cloud' },
]))
console.log(format.record({ Name: 'dev', Files: 42, Paused: false }))
console.log(format.lines(['~/dev', '~/Cloud']))
```

- `app.format.table(data, options?)`: rounded table from records, a 2-D array whose first row contains headers, or grouped tables. Grouped tables accept `{ headers: [...] }`.
- During CLI rendering, `format.table(data)` shows 50 data rows by default and saves remaining rows for `,next` or standalone `--next`. An explicit `{ limit: 20 }` changes the page size; `Infinity` shows all rows and `0` hides all data rows. Headers and group titles do not count. Outside a command renderer, omitting `limit` still formats all rows. Input data is not modified.
- `app.format.record(record, options?)`: a two-column key/value table, without a header row.
- `app.format.lines(iterable)`: one value per line, preserving order and blank values.
- `app.format.section(title, content)`: a heading followed by content, or `''` when content is blank.
- `app.format.field(label, value)`: an optional labelled line such as `Incomplete: timeout`. Blank or nullish values return `''`; `0` and `false` are preserved. Values use the same formatting as table cells.
- All return `''` for empty input and omit the trailing newline. Nullish cells are blank; objects and arrays are compact JSON.
- Tables and records color headings when the terminal supports ANSI. Use `{ color: false }` for plain strings or `{ color: true }` to force color.
- `printTable` keeps its existing printing behavior; use `app.format.table` to capture or compose the output.

## Render strings

A command's `.render()` returns a string or a flat array of strings. Use an array to separate sections with one blank line:

```ts
const { format } = app

app.cmd('list')
  .add(() => ({ entries: [{ name: 'demo' }], count: 1 }))
  .render(({ entries, count }) => {
    return [
      format.table(entries),
      format.field('Count', count),
    ]
  })
```

- The framework applies `trim()` to each string, skips empty strings, joins the remaining strings with one blank line, and prints one trailing newline. Empty output prints nothing.
- Internal whitespace and blank lines within each string are preserved. A single template string works too.
- `format.section(title, content)` joins a heading and trimmed content with one newline. Empty or whitespace-only content returns `''`, so an empty table also hides its heading.
- JSON, MCP and `execute()` return the handler's original data without invoking the renderer.
- Nested arrays, block objects, and other non-string values fail with `invalid_render_output` before any rendered output is printed.

## Saved table pages

No pagination setup is needed in a renderer:

```ts
const { format } = app

app.cmd('list').add(() => entries).render((rows) => {
  return [
    format.table(rows),
  ]
})
```

```sh
tool list       # Run once, show page 1 and save remaining table rows
,next           # Print the next table page only
tool --next     # Continue the same saved data
```

- One global item lives at `~/cache/script.js`; scripts share it. It stores table cells, headers, formatting options and offsets, not the original command or surrounding text.
- Every ordinary CLI execution replaces the saved item, even when it returns no tables. Help and programmatic `execute()` do not change it. JSON and MCP return full raw data; JSON execution clears prior pages, while MCP does not use the cache.
- `,next` and standalone `--next` never run the original handler. Through the `script.js` launcher, `--next` also skips importing the original script. Do not combine `--next` with subcommands or other arguments; use `--` to forward it literally.
- Continuation prints only tables that still have rows, including their column and group headers. It omits summaries, section labels, totals and pagination footers. At the end, stdout is empty and the command succeeds.
- The first page keeps the renderer's surrounding output and the existing `… N more rows` indicator. Small tables appear only on that initial page.
- Missing or invalid cached data produces an error on stderr. Rerun an ordinary command to replace invalid data. Cache writes are atomic and private; simultaneous updates report a busy-cache error instead of consuming the same page twice.

## exitWithError

Print an error message to stderr and exit with code 1. Optionally display help text.

```ts
import { exitWithError } from '@gutenye/script.js'

// Simple error
exitWithError('config file not found')
// Error: config file not found

// Error with help text
exitWithError('missing argument', 'Usage: myscript <file>')
// Error: missing argument
//
// Usage: myscript <file>
```

## printJson

Pretty-print a value as JSON on stdout, for output that other tools parse.

```ts
import { printJson } from '@gutenye/script.js'

printJson({ route: 'PayHome', pending: [] })
// {
//   "route": "PayHome",
//   "pending": []
// }
```

## printTable

Print data as a formatted console table with rounded borders and green headers.

Accepts an array of objects, a 2-D array (first row = headers), or an object of groups. Each group value can be a 2-D array or an array of objects. Empty groups are automatically skipped.

```ts
import { printTable } from '@gutenye/script.js'

// Array of objects
printTable([
  { name: 'alice', role: 'admin' },
  { name: 'bob', role: 'user' },
])
// ╭───────┬───────╮
// │ name  │ role  │
// ├───────┼───────┤
// │ alice │ admin │
// │ bob   │ user  │
// ╰───────┴───────╯

// 2-D array (first row is headers)
printTable([
  ['name', 'role'],
  ['alice', 'admin'],
  ['bob', 'user'],
])
// same output as above

// Grouped table (2-D array or array of objects per group)
printTable({
  General: [['Format', 'MPEG-4', 'good'], ['Duration', '1h', '']],
  Video: [['Codec', 'H.264', 'high']],
})
// ╭──────────────────────────╮
// │ General                  │
// ├──────────┬────────┬──────┤
// │ Format   │ MPEG-4 │ good │
// │ Duration │ 1h     │      │
// ├──────────┴────────┴──────┤
// │ Video                    │
// ├──────────┬────────┬──────┤
// │ Codec    │ H.264  │ high │
// ╰──────────┴────────┴──────╯

// Grouped table with headers
printTable({
  General: [['Format', 'Matroska', 'MPEG-4'], ['Duration', '1h 30m', '2h 10m']],
  Video: [['Codec', 'H.265', 'H.264'], ['Width', '3840', '1920']],
}, { headers: ['', 'file1.mkv', 'file2.mp4'] })
// ╭──────────┬───────────┬───────────╮
// │          │ file1.mkv │ file2.mp4 │
// ├──────────┴───────────┴───────────┤
// │ General                          │
// ├──────────┬───────────┬───────────┤
// │ Format   │ Matroska  │ MPEG-4    │
// │ Duration │ 1h 30m    │ 2h 10m    │
// ├──────────┴───────────┴───────────┤
// │ Video                            │
// ├──────────┬───────────┬───────────┤
// │ Codec    │ H.265     │ H.264     │
// │ Width    │ 3840      │ 1920      │
// ╰──────────┴───────────┴───────────╯
```
