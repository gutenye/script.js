# Helpers

Utility functions for writing scripts.

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
