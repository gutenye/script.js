import { describe, expect, test } from 'bun:test'
import path from 'node:path'

const scriptTs = path.resolve(import.meta.dir, '../script.ts')
const fixture = path.resolve(import.meta.dir, 'fixtures/hello.ts')

function run(...args: string[]) {
  const result = Bun.spawnSync(['bun', scriptTs, fixture, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    stdout: result.stdout.toString().trimEnd(),
    stderr: result.stderr.toString().trimEnd(),
    exitCode: result.exitCode,
  }
}

function runRaw(...args: string[]) {
  const result = Bun.spawnSync(['bun', scriptTs, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return {
    stdout: result.stdout.toString().trimEnd(),
    stderr: result.stderr.toString().trimEnd(),
    exitCode: result.exitCode,
  }
}

describe('script.ts', () => {
  test('prints usage and exits 1 when no script path given', () => {
    const result = runRaw()
    expect(result.stderr).toContain('Usage: script.js <script>')
    expect(result.exitCode).toBe(1)
  })

  test('runs command with positional argument', () => {
    const result = run('greet', 'world')
    expect(result.stdout).toBe('hello world')
    expect(result.exitCode).toBe(0)
  })

  test('runs command with option flag', () => {
    const result = run('greet', 'world', '--uppercase')
    expect(result.stdout).toBe('HELLO WORLD')
    expect(result.exitCode).toBe(0)
  })

  test('runs command with short flag', () => {
    const result = run('greet', 'world', '-u')
    expect(result.stdout).toBe('HELLO WORLD')
    expect(result.exitCode).toBe(0)
  })

  test('globals are available in user script (cmd used without import)', () => {
    const result = run('greet', 'test')
    expect(result.stdout).toBe('hello test')
  })
})
