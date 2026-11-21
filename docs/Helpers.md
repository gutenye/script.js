# Helpers

Utility functions for writing scripts.

## app.format

Format data as a string without printing it. Available on the existing `app`, including in `#!/usr/bin/env script.js` scripts; no separate formatter import is needed:

```ts
import { app } from '@gutenye/script.js'

console.log(app.format.table([
  { Name: 'dev', Path: '~/dev' },
  { Name: 'Cloud', Path: '~/Cloud' },
]))
console.log(app.format.record({ Name: 'dev', Files: 42, Paused: false }))
console.log(app.format.lines(['~/dev', '~/Cloud']))
```

- `app.format.table(data, options?)`: rounded table from records, a 2-D array whose first row contains headers, or grouped tables. Grouped tables accept `{ headers: [...] }`.
- `app.format.record(record, options?)`: a two-column key/value table, without a header row.
- `app.format.lines(iterable)`: one value per line, preserving order and blank values.
- All return `''` for empty input and omit the trailing newline. Nullish cells are blank; objects and arrays are compact JSON.
- Tables and records color headings when the terminal supports ANSI. Use `{ color: false }` for plain strings or `{ color: true }` to force color.
- `printTable` keeps its existing printing behavior; use `app.format.table` to capture or compose the output.

## Output blocks

A command's `.render()` can return a string, a single block, or an ordered array of strings and blocks:

```ts
app.cmd('list')
  .add(() => ({ entries: [{ name: 'demo' }], count: 1 }))
  .render(({ entries, count }) => [
    { table: entries, options: { color: false } },
    { record: { count } },
    { lines: ['first', 'second'] },
    { format: (value) => `Total: ${value}`, data: count },
    'Finished',
  ])
```

- Use bare strings for text and exactly one of `table`, `record`, `lines`, or `format` per object.
- `table` and `record` pass optional `options` to the corresponding `app.format` helper.
- A custom `format` function receives `data` and optional `options`, and must return a string synchronously.
- Blocks render in order, with one blank line between nonempty blocks; empty blocks produce no extra spacing.
- Existing formatter calls work too: `[app.format.table(entries), 'Finished']`.
- JSON, MCP and `execute()` return the handler's original data without invoking the renderer.
- Invalid or ambiguous blocks fail with `invalid_render_block` before any rendered output is printed.

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
