import { describe, expect, test } from 'bun:test'
import { realpathSync } from 'node:fs'
import { $, $defaults } from '../spawn'

describe('$', () => {
  test('text() captures stdout', () => {
    const result = $`echo hello`.text()
    expect(result).toBe('hello\n')
  })

  test('json() parses stdout as JSON', () => {
    const result = $`echo '{"a":1}'`.json()
    expect(result).toEqual({ a: 1 })
  })

  test('lines() splits stdout by newline', () => {
    const result = $`printf "a\nb\nc"`.lines()
    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('exitCode returns process exit code', () => {
    const code = $`exit 42`.exitCode
    expect(code).toBe(42)
  })

  test('interpolates strings with shell escaping', () => {
    const name = 'Mike Smith'
    const result = $`echo ${name}`.text()
    expect(result).toBe('Mike Smith\n')
  })

  test('interpolates arrays as separate arguments', () => {
    const args = ['arg 1', 'arg 2']
    const result = $`echo ${args}`.text()
    expect(result).toBe('arg 1 arg 2\n')
  })
})

describe('.cwd()', () => {
  test('sets working directory for command', () => {
    const cwd = realpathSync('/tmp')
    const result = $`pwd`.cwd(cwd).text()
    expect(result.trim()).toBe(cwd)
  })
})

describe('.env()', () => {
  test('sets environment variables for command', () => {
    const result = $`echo $TEST_VAR`.env({ ...process.env, TEST_VAR: 'hello' }).text()
    expect(result.trim()).toBe('hello')
  })
})

describe('.quiet()', () => {
  test('suppresses inherit fallback, returns self for chaining', () => {
    const cmd = $`echo quiet-test`.quiet()
    expect(cmd).toBeDefined()
  })

  test('can chain .quiet().text()', () => {
    const result = $`echo quiet`.quiet().text()
    expect(result).toBe('quiet\n')
  })
})

describe('global defaults', () => {
  test('$defaults.cwd sets default working directory', () => {
    const prev = $defaults.cwd
    $defaults.cwd = realpathSync('/tmp')
    const result = $`pwd`.text()
    expect(result.trim()).toBe(realpathSync('/tmp'))
    $defaults.cwd = prev
  })

  test('$defaults.env sets default environment variables', () => {
    const prev = $defaults.env
    $defaults.env = { ...process.env, TEST_GLOBAL: 'global_val' }
    const result = $`echo $TEST_GLOBAL`.text()
    expect(result.trim()).toBe('global_val')
    $defaults.env = prev
  })

  test('per-call .cwd() overrides global default', () => {
    $defaults.cwd = '/var'
    const result = $`pwd`.cwd(realpathSync('/tmp')).text()
    expect(result.trim()).toBe(realpathSync('/tmp'))
    $defaults.cwd = undefined
  })
})
