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
- Table option `{ limit: 50 }` shows the first 50 data rows followed by `… N more rows`; headers and group titles do not count. Omit `limit` or use `Infinity` for all rows. `0` hides all data rows; negative or fractional limits are invalid. Input data is not modified.
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
