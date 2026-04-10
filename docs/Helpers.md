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

Accepts an array of objects, a 2-D array (first row = headers), or an object of groups (spanning headers). Empty groups are automatically skipped.

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

// Grouped table
printTable({
  General: { Format: 'MPEG-4', Duration: '1h 30m' },
  Video: { Codec: 'H.264', Width: '1920' },
})
// ╭───────────────────╮
// │ General           │
// ├──────────┬────────┤
// │ Format   │ MPEG-4 │
// │ Duration │ 1h 30m │
// ├──────────┴────────┤
// │ Video             │
// ├──────────┬────────┤
// │ Codec    │ H.264  │
// │ Width    │ 1920   │
// ╰──────────┴────────╯
```
