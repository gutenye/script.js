# Helpers

Utility functions for writing scripts.

## printTable

Print data as a formatted console table with rounded borders and green headers.

Accepts either an array of objects or a 2-D array (first row = headers):

```ts
import { printTable } from '@gutenye/script.js'

// Array of objects
printTable([
  { name: 'alice', role: 'admin' },
  { name: 'bob', role: 'user' },
])

// 2-D array (first row is headers)
printTable([
  ['name', 'role'],
  ['alice', 'admin'],
  ['bob', 'user'],
])
```

Output:

```
╭───────┬───────╮
│ name  │ role  │
├───────┼───────┤
│ alice │ admin │
│ bob   │ user  │
╰───────┴───────╯
```

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
