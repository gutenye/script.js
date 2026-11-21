import { afterEach, beforeEach, expect, test } from 'bun:test'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '../..')
const launcher = path.join(root, 'src/script.ts')
const fixture = path.join(root, 'src/__tests__/fixtures/pagination.ts')
const next = path.join(root, 'src/next.ts')
let directory: string
let cache: string
let marker: string

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'scriptjs-pagination-'))
  cache = path.join(directory, 'cache')
  marker = path.join(directory, 'marker')
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

function run(args: string[], script = launcher) {
  const result = Bun.spawnSync(['bun', script, ...args], {
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      SCRIPTJS_PAGINATION_CACHE: cache,
      SCRIPTJS_PAGINATION_MARKER: marker,
      CARAPACE_SPECS_DIR: path.join(directory, 'specs'),
    },
  })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

test('pages saved tables without rerunning the script or repeating surrounding output', () => {
  const first = run([fixture, 'rows'])
  expect(first.exitCode, first.stderr).toBe(0)
  expect(first.stdout.match(/row-\d+/g)).toHaveLength(50)
  expect(first.stdout).toContain('row-050')
  expect(first.stdout).not.toContain('row-051')
  expect(first.stdout).toContain('… 73 more rows')
  expect(first.stdout).toContain('Summary')
  expect(first.stdout).toContain('Totals: 123')
  unlinkSync(marker)
  const second = run([fixture, '--next'])
  expect(second.exitCode, second.stderr).toBe(0)
  expect(second.stdout.match(/row-\d+/g)).toHaveLength(50)
  expect(second.stdout).toContain('row-051')
  expect(second.stdout).toContain('row-100')
  for (const text of [
    'Summary',
    'Inventory:',
    'Totals:',
    'small-table',
    'more rows',
  ]) {
    expect(second.stdout).not.toContain(text)
  }
  expect(existsSync(marker)).toBe(false)
  const third = run([], next)
  expect(third.exitCode, third.stderr).toBe(0)
  expect(third.stdout.match(/row-\d+/g)).toHaveLength(23)
  expect(third.stdout).toContain('row-123')
  expect(third.stdout).toContain('extra')
  expect(third.stdout).toContain('last')
  expect(third.stdout).toEndWith('╯\n')
  expect(run([], next).stdout).toBe('')
  expect(run(['--next']).stdout).toBe('')
  const saved = JSON.parse(readFileSync(cache, 'utf8'))
  expect(Object.keys(saved).sort()).toEqual(['tables', 'version'])
  expect(statSync(cache).mode & 0o777).toBe(0o600)
})

test('one global cache follows the latest ordinary command across scripts', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  const other = path.join(directory, 'other.ts')
  writeFileSync(
    other,
    `import { app } from ${JSON.stringify(path.join(root, 'src/index.ts'))}\nconst { format } = app\napp.name('other').add(() => Array.from({ length: 3 }, (_, index) => ({ value: 'other-' + index }))).render((rows) => {\nreturn [\nformat.table(rows, { limit: 1 }),\n]\n})\nawait app.run()\n`,
  )
  expect(run([], other).stdout).toContain('other-0')
  expect(run([], next).stdout).toContain('other-1')
  expect(run([], next).stdout).toContain('other-2')
  expect(run([], other).stdout).toContain('other-0')
  expect(run([], next).stdout).toContain('other-1')
  expect(run([fixture, 'printed']).exitCode).toBe(0)
  expect(run([], next).stdout).toBe('')
})

test('group and matrix pages repeat headers and advance data rows only', () => {
  expect(run([fixture, 'grouped']).stdout).toContain('beta')
  const second = run([], next)
  expect(second.exitCode, second.stderr).toBe(0)
  for (const text of ['name', 'One', 'Two', 'gamma', 'delta'])
    expect(second.stdout).toContain(text)
  expect(second.stdout).not.toContain('alpha')
  expect(second.stdout).not.toContain('epsilon')
  expect(second.stdout).not.toContain('more row')
  const third = run([], next)
  expect(third.stdout).toContain('Two')
  expect(third.stdout).toContain('epsilon')
  expect(third.stdout).not.toContain('One')
  expect(run([], next).stdout).toBe('')
  expect(run([fixture, 'matrix']).stdout).toContain('beta')
  const matrix = run([], next)
  expect(matrix.stdout).toContain('name')
  expect(matrix.stdout).toContain('gamma')
  expect(matrix.stdout).not.toContain('alpha')
})

test('JSON returns all rows and short or empty output replaces previous pages', () => {
  const json = run([fixture, 'rows', '--json'])
  expect(json.exitCode, json.stderr).toBe(0)
  expect(JSON.parse(json.stdout)).toHaveLength(123)
  expect(run([], next).stdout).toBe('')
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  expect(run([fixture, 'short']).stdout).toContain('short')
  expect(run([], next).stdout).toBe('')
})

test('--next must stand alone and respects the -- forwarding boundary', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  unlinkSync(marker)
  const invalid = run([fixture, 'rows', '--next'])
  expect(invalid.exitCode).toBe(2)
  expect(invalid.stdout).toBe('')
  expect(invalid.stderr).toContain('--next must be used alone')
  expect(existsSync(marker)).toBe(false)
  const forwarded = run([fixture, 'forward', '--json', '--', '--next'])
  expect(forwarded.exitCode, forwarded.stderr).toBe(0)
  expect(JSON.parse(forwarded.stdout)).toEqual(['--', '--next'])
})

test('missing or invalid cache fails on stderr without running a command', () => {
  const missing = run([], next)
  expect(missing.exitCode).toBe(1)
  expect(missing.stdout).toBe('')
  expect(missing.stderr).toContain('No saved table')
  writeFileSync(cache, '{broken')
  const broken = run([fixture, '--next'])
  expect(broken.exitCode).toBe(1)
  expect(broken.stdout).toBe('')
  expect(broken.stderr).toContain('invalid')
  writeFileSync(
    cache,
    JSON.stringify({ version: 1, tables: [{ data: 'bad' }] }),
  )
  expect(run([], next).exitCode).toBe(1)
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  expect(run([], next).stdout).toContain('row-051')
})

test('multiple tables keep independent offsets and stop repeating completed tables', () => {
  expect(run([fixture, 'multiple']).exitCode).toBe(0)
  const second = run([], next)
  expect(second.exitCode, second.stderr).toBe(0)
  expect(second.stdout).toContain('left-2')
  expect(second.stdout).toContain('right-1')
  expect(second.stdout).toContain('\x1b[')
  const third = run([], next)
  expect(third.stdout).toContain('right-2')
  expect(third.stdout).not.toContain('left-')
  expect(third.stdout).not.toContain('\x1b[')
  expect(run([], next).stdout).toContain('right-3')
  expect(run([], next).stdout).toBe('')
})

test('saved cells keep their display values and discarded formatter output is not cached', () => {
  expect(run([fixture, 'values']).exitCode).toBe(0)
  const page = run([], next)
  expect(page.exitCode, page.stderr).toBe(0)
  expect(page.stdout).toContain('42')
  expect(page.stdout).toContain('{"ok":true}')
  expect(run([fixture, 'discarded']).stdout).toBe('not a table\n')
  expect(run([], next).stdout).toBe('')
})

test('the Ake launcher resumes without finding or loading an ake file', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  const result = run(['--next'], path.join(root, 'src/ake/ake.ts'))
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toContain('row-051')
  expect(result.stdout).not.toContain('Summary')
  expect(
    run(['--next', '--next'], path.join(root, 'src/ake/ake.ts')).exitCode,
  ).toBe(2)
})

test('a busy cache does not consume or overwrite a saved page', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  const before = readFileSync(cache, 'utf8')
  writeFileSync(`${cache}.lock`, '')
  const busy = run([], next)
  expect(busy.exitCode).toBe(1)
  expect(busy.stdout).toBe('')
  expect(busy.stderr).toContain('busy')
  expect(readFileSync(cache, 'utf8')).toBe(before)
  unlinkSync(`${cache}.lock`)
  expect(run([], next).stdout).toContain('row-051')
})

test('a lock left by an exited process can be recovered', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  const owner = Bun.spawnSync([
    'bun',
    '-e',
    'process.stdout.write(String(process.pid))',
  ])
  expect(owner.exitCode).toBe(0)
  writeFileSync(`${cache}.lock`, owner.stdout)
  const page = run([], next)
  expect(page.exitCode, page.stderr).toBe(0)
  expect(page.stdout).toContain('row-051')
  expect(existsSync(`${cache}.lock`)).toBe(false)
})

test('the public next entry point preserves pages on help and invalid arguments', () => {
  expect(run([fixture, 'rows']).exitCode).toBe(0)
  const before = readFileSync(cache, 'utf8')
  const help = run(['--help'], next)
  expect(help.exitCode, help.stderr).toBe(0)
  expect(help.stdout).toBe(
    'Usage: ,next\n\nPrint the next page of the most recently saved tables.\n',
  )
  const invalid = run(['extra'], next)
  expect(invalid.exitCode).toBe(2)
  expect(invalid.stdout).toBe('')
  expect(invalid.stderr).toContain('--next must be used alone')
  expect(readFileSync(cache, 'utf8')).toBe(before)
  expect(run([], next).stdout).toContain('row-051')
})
