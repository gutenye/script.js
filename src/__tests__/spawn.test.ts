import { describe, expect, test } from 'bun:test'
import { realpathSync } from 'node:fs'
import { $, exitOnShellError, ShellError } from '../spawn'

describe('throw error', () => {
  test('$`cmd` throws on non-zero exit', async () => {
    const promise = (async () => await $`exit 1`)()
    await expect(promise).rejects.toThrow(ShellError)
    await expect(promise).rejects.toThrow(
      'Command failed with exit code 1: exit 1',
    )
  })

  test('$`cmd` does not throw on zero exit', async () => {
    await expect((async () => await $`exit 0`)()).resolves.toEqual({
      exitCode: 0,
    })
  })

  test('$`cmd`.text() throws on non-zero exit', () => {
    expect(() => $`exit 1`.text()).toThrow()
  })

  test('$`cmd` trims surrounding whitespace from the reported command', async () => {
    const promise = (async () =>
      await $`
      exit 1
    `)()
    await expect(promise).rejects.toThrow(
      'Command failed with exit code 1: exit 1',
    )
  })

  test('exitOnShellError() rethrows a non-shell error', () => {
    const error = new Error('regular failure')
    expect(() => exitOnShellError(error)).toThrow(error)
  })
})

describe('$', () => {
  test('text() captures stdout trimmed', () => {
    const result = $`echo hello`.text()
    expect(result).toBe('hello')
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
    const result = $`printf "<%s>" ${name}`.text()
    expect(result).toBe('<Mike Smith>')
  })

  test('interpolates arrays as separate arguments', () => {
    const args = ['arg 1', 'arg 2']
    const result = $`printf "<%s>" ${args}`.text()
    expect(result).toBe('<arg 1><arg 2>')
  })
})

describe('.nothrow()', () => {
  test('await returns exitCode instead of throwing', async () => {
    const { exitCode } = await $`exit 3`.nothrow()
    expect(exitCode).toBe(3)
  })

  test('await returns exitCode on success', async () => {
    const { exitCode } = await $`exit 0`.nothrow()
    expect(exitCode).toBe(0)
  })

  test('text() returns stdout instead of throwing', () => {
    const result = $`echo hi; exit 1`.nothrow().text()
    expect(result).toBe('hi')
  })
})

describe('.cwd()', () => {
  test('sets working directory for command', () => {
    const cwd = realpathSync('/tmp')
    const result = $`pwd`.cwd(cwd).text()
    expect(result).toBe(cwd)
  })
})

describe('.env()', () => {
  test('sets environment variables for command', () => {
    const result = $`echo $TEST_VAR`.env({ TEST_VAR: 'hello' }).text()
    expect(result).toBe('hello')
  })
})

describe('$.cwd() / $.env()', () => {
  test('$.cwd() sets default working directory', () => {
    const tmp = realpathSync('/tmp')
    $.cwd(tmp)
    const result = $`pwd`.text()
    expect(result).toBe(tmp)
    $.cwd(undefined as any)
  })

  test('$.env() sets default environment variables', () => {
    $.env({ TEST_GLOBAL: 'global_val' })
    const result = $`echo $TEST_GLOBAL`.text()
    expect(result).toBe('global_val')
    $.env(undefined as any)
  })

  test('per-call .cwd() overrides $.cwd()', () => {
    $.cwd('/var')
    const tmp = realpathSync('/tmp')
    const result = $`pwd`.cwd(tmp).text()
    expect(result).toBe(tmp)
    $.cwd(undefined as any)
  })
})

describe('$.global', () => {
  test('defines shell code available in subsequent commands', () => {
    $.global`e() { echo hello "$@"; }`
    const result = $`e world`.text()
    expect(result).toBe('hello world')
  })

  test('preserves order and includes unscoped + matching scoped preambles', () => {
    const tmp = realpathSync('/tmp')
    $.global`A=1`
    $.global`B=2`.cwd(tmp)
    $.global`C=3`
    const withCwd = $`echo $A.$B.$C`.cwd(tmp).text()
    expect(withCwd).toBe('1.2.3')
    const withoutCwd = $`echo $A.$B.$C`.text()
    expect(withoutCwd).toBe('1..3')
  })
})
