# Completion v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reimplement Carapace YAML spec generation natively in v2 with auto-install, function completions, and ake auto-naming.

**Architecture:** Separate `src/completion.ts` module with `buildSpec()`, `buildSpecText()`, and `installCompletion()` functions. Wired into `src/script.ts` as fire-and-forget before `app.run()`. Argument/Option classes widened to accept `string[] | (() => string[])` for completion values.

**Tech Stack:** TypeScript, Bun, `yaml` package (already a direct dependency), Carapace spec format.

---

### Task 1: Widen completion type on Argument

**Files:**
- Modify: `src/Argument.ts`
- Test: `src/__tests__/Argument.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/Argument.test.ts`:

```typescript
test('accepts function completion', () => {
  const fn = () => ['ios', 'android']
  const arg = new Argument('<platform>', 'Platform', fn)
  expect(arg.completion).toBe(fn)
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/Argument.test.ts`
Expected: FAIL — TypeScript type error, `completion` typed as `string[]` not accepting function

**Step 3: Write minimal implementation**

In `src/Argument.ts`, change:

```typescript
// Before
completion: string[]
constructor(rawName: string, description = '', completion: string[] = []) {

// After
completion: string[] | (() => string[])
constructor(rawName: string, description = '', completion: string[] | (() => string[]) = []) {
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/Argument.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/Argument.ts src/__tests__/Argument.test.ts
git commit -m "feat: widen Argument completion to accept string[] | function"
```

---

### Task 2: Widen completion type on Option

**Files:**
- Modify: `src/Option.ts`
- Test: `src/__tests__/Option.test.ts`

**Step 1: Write the failing test**

Add to `src/__tests__/Option.test.ts`:

```typescript
test('accepts function completion', () => {
  const fn = () => ['json', 'yaml']
  const opt = new Option('--format <type>', 'Output format', fn)
  expect(opt.completion).toBe(fn)
  expect(opt.defaultValue).toBeUndefined()
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/Option.test.ts`
Expected: FAIL — function passed as `defaultValueOrCompletion` falls to else branch, stored as `defaultValue`

**Step 3: Write minimal implementation**

In `src/Option.ts`, change:

```typescript
// Before
completion: string[]
// ...
if (Array.isArray(defaultValueOrCompletion)) {
  this.completion = defaultValueOrCompletion
  this.defaultValue = undefined
} else {
  this.completion = []
  this.defaultValue = defaultValueOrCompletion
}

// After
completion: string[] | (() => string[])
// ...
if (Array.isArray(defaultValueOrCompletion) || typeof defaultValueOrCompletion === 'function') {
  this.completion = defaultValueOrCompletion
  this.defaultValue = undefined
} else {
  this.completion = []
  this.defaultValue = defaultValueOrCompletion
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/Option.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/Option.ts src/__tests__/Option.test.ts
git commit -m "feat: widen Option completion to accept string[] | function"
```

---

### Task 3: Create completion module — `buildSpec()`

**Files:**
- Create: `src/completion.ts`
- Create: `src/__tests__/completion.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/completion.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { Command } from '../Command'
import { buildSpec } from '../completion'

describe('buildSpec()', () => {
  test('builds spec with name, description, aliases', () => {
    const c = new Command()
    c.define('myapp | m', 'My app')
    const spec = buildSpec(c)
    expect(spec.name).toBe('myapp')
    expect(spec.aliases).toEqual(['m'])
    expect(spec.description).toBe('My app')
  })

  test('builds flags for boolean option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('-v | --verbose', 'Verbose')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '-v, --verbose': 'Verbose',
    })
  })

  test('builds flags for required value option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('--port <n>', 'Port')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '--port=': 'Port',
    })
  })

  test('builds flags for optional value option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('--debug [level]', 'Debug')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '--debug=?': 'Debug',
    })
  })

  test('builds completion.positional from argument completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy')
      .a('<env>', 'Environment', ['staging', 'production'])
      .a('<region>', 'Region', ['us', 'eu'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positional).toEqual([
      ['staging', 'production'],
      ['us', 'eu'],
    ])
  })

  test('builds completion.positionalany for variadic argument', () => {
    const c = new Command()
    c.define('myapp')
    c.command('run')
      .a('[...files]', 'Files', ['a.ts', 'b.ts'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positionalany).toEqual(['a.ts', 'b.ts'])
    expect(spec.commands![0].completion?.positional).toBeUndefined()
  })

  test('resolves function completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy')
      .a('<env>', 'Env', () => ['staging', 'production'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positional).toEqual([
      ['staging', 'production'],
    ])
  })

  test('builds completion.flag for options with completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build')
      .a('--format <type>', 'Format', ['json', 'yaml'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.flag).toEqual({
      format: ['json', 'yaml'],
    })
  })

  test('recurses into subcommands', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy', 'Deploy app')
    c.command('build', 'Build app')
    const spec = buildSpec(c)
    expect(spec.commands).toHaveLength(2)
    expect(spec.commands![0].name).toBe('deploy')
    expect(spec.commands![1].name).toBe('build')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/completion.test.ts`
Expected: FAIL — `../completion` module not found

**Step 3: Write minimal implementation**

Create `src/completion.ts`:

```typescript
import type { Command } from './Command'

export type CompletionValue = string[] | (() => string[])

type CarapaceSpec = {
  name: string
  aliases?: string[]
  description?: string
  flags?: Record<string, string>
  completion?: CarapaceCompletion
  commands?: CarapaceSpec[]
}

type CarapaceCompletion = {
  positional?: string[][]
  positionalany?: string[]
  flag?: Record<string, string[]>
}

function resolveCompletion(completion: CompletionValue): string[] {
  if (typeof completion === 'function') {
    try {
      return completion()
    } catch {
      return []
    }
  }
  return completion
}

export function buildSpec(command: Command): CarapaceSpec {
  const spec: CarapaceSpec = { name: command.name! }

  if (command.description) {
    spec.description = command.description
  }
  if (command.aliases.length > 0) {
    spec.aliases = command.aliases
  }

  const completion: CarapaceCompletion = {}

  // Arguments → positional / positionalany
  const positional: string[][] = []
  for (const arg of command.arguments) {
    const values = resolveCompletion(arg.completion)
    if (arg.variadic) {
      if (values.length > 0) {
        completion.positionalany = values
      }
    } else {
      positional.push(values)
    }
  }
  if (positional.some((v) => v.length > 0)) {
    completion.positional = positional
  }

  // Options → flags + completion.flag
  for (const opt of command.options) {
    spec.flags = spec.flags || {}
    let flag = [opt.short, opt.long].filter(Boolean).join(', ')
    if (opt.required) flag += '='
    else if (opt.optional) flag += '=?'
    spec.flags[flag] = opt.description

    const values = resolveCompletion(opt.completion)
    if (values.length > 0) {
      completion.flag = completion.flag || {}
      const key = opt.long?.replace(/^--/, '') || opt.attributeName
      completion.flag[key] = values
    }
  }

  if (Object.keys(completion).length > 0) {
    spec.completion = completion
  }

  // Subcommands
  for (const sub of command.commands) {
    spec.commands = spec.commands || []
    spec.commands.push(buildSpec(sub))
  }

  return spec
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/completion.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/completion.ts src/__tests__/completion.test.ts
git commit -m "feat: add buildSpec() for Carapace YAML generation"
```

---

### Task 4: Add `buildSpecText()` and `installCompletion()`

**Files:**
- Modify: `src/completion.ts`
- Modify: `src/__tests__/completion.test.ts`

**Step 1: Write the failing tests**

Add to `src/__tests__/completion.test.ts`:

```typescript
import { buildSpec, buildSpecText } from '../completion'

describe('buildSpecText()', () => {
  test('returns undefined when no commands or completions', () => {
    const c = new Command()
    c.define('myapp')
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns undefined when name is missing', () => {
    const c = new Command()
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns spec and yaml text', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build', 'Build').a('-v | --verbose', 'Verbose')
    const result = buildSpecText(c)!
    expect(result.spec.name).toBe('myapp')
    expect(result.text).toContain('name: myapp')
    expect(result.text).toContain('build')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/completion.test.ts`
Expected: FAIL — `buildSpecText` not exported

**Step 3: Write minimal implementation**

Add to `src/completion.ts`:

```typescript
import * as yaml from 'yaml'

export function buildSpecText(command: Command): { spec: CarapaceSpec; text: string } | undefined {
  if (!command.name) return undefined

  const spec = buildSpec(command)
  if (!(spec.commands || spec.flags || spec.completion)) return undefined

  const text = yaml.stringify(spec)
  return { spec, text }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/completion.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/completion.ts src/__tests__/completion.test.ts
git commit -m "feat: add buildSpecText() for YAML serialization"
```

---

### Task 5: Add `installCompletion()` with ake auto-naming

**Files:**
- Modify: `src/completion.ts`
- Modify: `src/__tests__/completion.test.ts`

**Step 1: Write the failing tests**

Add to `src/__tests__/completion.test.ts`:

```typescript
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach } from 'bun:test'
import { installCompletion } from '../completion'

describe('installCompletion()', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('writes spec file when command has name and commands', async () => {
    const c = new Command()
    c.define('myapp')
    c.command('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    const content = fs.readFileSync(`${tmpDir}/myapp.yaml`, 'utf8')
    expect(content).toContain('name: myapp')
  })

  test('skips when name is missing', async () => {
    const c = new Command()
    c.command('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    expect(fs.readdirSync(tmpDir)).toHaveLength(0)
  })

  test('skips write when file is identical', async () => {
    const c = new Command()
    c.define('myapp')
    c.command('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    const stat1 = fs.statSync(`${tmpDir}/myapp.yaml`)
    await installCompletion(c, { specsDir: tmpDir })
    const stat2 = fs.statSync(`${tmpDir}/myapp.yaml`)
    expect(stat1.mtimeMs).toBe(stat2.mtimeMs)
  })

  test('auto-names ake scripts from scriptPath', async () => {
    const c = new Command()
    c.command('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir, scriptPath: '/some/path/ake' })
    const files = fs.readdirSync(tmpDir)
    expect(files.length).toBe(1)
    expect(files[0]).toMatch(/^ake\..*\.yaml$/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test src/__tests__/completion.test.ts`
Expected: FAIL — `installCompletion` not exported

**Step 3: Write minimal implementation**

Add to `src/completion.ts`:

```typescript
import nodeFs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function getCarapaceSpecsDir(): string {
  const homeDir = os.homedir()
  switch (os.platform()) {
    case 'darwin':
      return path.join(homeDir, 'Library/Application Support/carapace/specs')
    case 'win32': {
      const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData/Local')
      return path.join(localAppData, 'carapace/specs')
    }
    default: {
      const configHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config')
      return path.join(configHome, 'carapace/specs')
    }
  }
}

type InstallOptions = {
  scriptPath?: string
  specsDir?: string
}

export async function installCompletion(command: Command, options: InstallOptions = {}) {
  try {
    if (!command.name && options.scriptPath) {
      const basename = path.basename(options.scriptPath)
      if (basename === 'ake') {
        command.name = `ake.${nodeFs.realpathSync(process.cwd()).replaceAll('/', '_')}`
      }
    }

    const result = buildSpecText(command)
    if (!result) return

    const specsDir = options.specsDir || getCarapaceSpecsDir()
    const filePath = path.join(specsDir, `${result.spec.name}.yaml`)

    let existing: string | undefined
    try {
      existing = nodeFs.readFileSync(filePath, 'utf8')
    } catch {}

    if (existing === result.text) return

    nodeFs.mkdirSync(specsDir, { recursive: true })
    nodeFs.writeFileSync(filePath, result.text)
  } catch {
    // completion is supplementary — silently ignore errors
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/__tests__/completion.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/completion.ts src/__tests__/completion.test.ts
git commit -m "feat: add installCompletion() with ake auto-naming"
```

---

### Task 6: Wire into script.ts

**Files:**
- Modify: `src/script.ts`

**Step 1: Add installCompletion call**

In `src/script.ts`, add import and call before `app.run()`:

```typescript
#!/usr/bin/env bun --env-file ''

import path from 'node:path'
import { app, cmd } from './Command'
import { installCompletion } from './completion'
import { $ } from './spawn'

globalThis.$ = $
globalThis.app = app
globalThis.cmd = cmd

const scriptPath = Bun.argv[2]
if (!scriptPath) {
  console.error('Usage: script.js <script>')
  process.exit(1)
}

await import(path.resolve(scriptPath))
installCompletion(app, { scriptPath })
await app.run(Bun.argv.slice(3))
```

**Step 2: Run full test suite**

Run: `bun test`
Expected: PASS (all tests)

**Step 3: Manual smoke test**

Run: `bun src/script.ts src/__tests__/fixtures/hello.ts` and check that a spec file appears in `~/Library/Application Support/carapace/specs/` (if the fixture defines a name and commands).

**Step 4: Commit**

```bash
git add src/script.ts
git commit -m "feat: wire installCompletion into script.ts entry point"
```

---

### Task 7: Run full test suite and clean up

**Step 1: Run all tests**

Run: `bun test`
Expected: PASS (all tests green)

**Step 2: Run linter**

Run: `bun run lint`
Expected: PASS or auto-fixed

**Step 3: Final commit if any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes"
```
