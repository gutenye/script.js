import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Command } from '../Command'
import { CommandError, toErrorShape } from '../structured'

const scriptTs = path.resolve(import.meta.dir, '../script.ts')
const fixture = path.resolve(import.meta.dir, 'fixtures/structured.ts')
const specsDir = mkdtempSync(path.join(tmpdir(), 'structured-specs-'))

function run(...args: string[]) {
  const result = Bun.spawnSync(['bun', scriptTs, fixture, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, CARAPACE_SPECS_DIR: specsDir },
  })
  return {
    stdout: result.stdout.toString().trimEnd(),
    stderr: result.stderr.toString().trimEnd(),
    exitCode: result.exitCode,
  }
}

describe('app.json()', () => {
  test('prints the returned value as compact JSON when piped', () => {
    const { stdout, exitCode } = run('-d', 'iPhone', 'state')
    expect(stdout).toBe('{"device":"iPhone","verbose":false}')
    expect(exitCode).toBe(0)
  })

  test('keeps shell output apart from the result', () => {
    const { stdout } = run('echo', 'hi', '--count', '2')
    expect(stdout.split('\n')).toEqual([
      'shell:hi',
      '{"echoed":"hi","count":2}',
    ])
  })

  test('prints a thrown error as JSON on stderr with its code', () => {
    const { stdout, stderr, exitCode } = run('fail')
    expect(stdout).toBe('')
    expect(JSON.parse(stderr)).toEqual({
      error: { code: 'no_device', message: 'No device booted' },
    })
    expect(exitCode).toBe(1)
  })

  test('reports a usage error as JSON and exits 2', () => {
    const { stdout, stderr, exitCode } = run('state', '--verbos')
    expect(stdout).toBe('')
    const { error } = JSON.parse(stderr)
    expect(error.code).toBe('usage')
    expect(error.message).toBe(
      'Unknown option: --verbos (did you mean --verbose?)',
    )
    expect(error.data.usage).toBe('structured-fixture state')
    expect(exitCode).toBe(2)
  })

  test('fails an action that outlives its timeout', () => {
    const { stderr, exitCode } = run('slow')
    expect(JSON.parse(stderr).error).toEqual({
      code: 'timeout',
      message: 'structured-fixture slow timed out after 100ms',
    })
    expect(exitCode).toBe(1)
  })

  test('prints a readable result on a terminal', async () => {
    const c = new Command()
    c.name('tool').json()
    c.cmd('state').add(() => ({ route: 'Home' }))
    const logs: string[] = []
    const origLog = console.log
    const isTTY = process.stdout.isTTY
    console.log = (...args: any[]) => logs.push(args.join(' '))
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
    })
    try {
      await c.parse(['state'])
    } finally {
      console.log = origLog
      Object.defineProperty(process.stdout, 'isTTY', {
        value: isTTY,
        configurable: true,
      })
    }
    expect(logs).toEqual(['{\n  "route": "Home"\n}'])
  })

  test('tells the handler whether output is JSON', async () => {
    const c = new Command()
    c.json()
    let json: boolean | undefined
    c.cmd('state').add((_options, context) => {
      json = context.json
    })
    await c.parse(['state', '--json'])
    expect(json).toBe(true)
  })
})

describe('--help --json', () => {
  test('prints the whole command tree', () => {
    const { stdout, exitCode } = run('--help', '--json')
    const tree = JSON.parse(stdout)
    expect(exitCode).toBe(0)
    expect(tree.name).toBe('structured-fixture')
    expect(tree.commands.map((command: any) => command.name)).toEqual([
      'state',
      'fail',
      'echo',
      'exit',
      'slow',
    ])
    const state = tree.commands[0]
    expect(state.examples).toEqual([
      {
        command: 'structured-fixture state -d iPhone',
        description: 'State on a device',
      },
    ])
    expect(state.options).toContainEqual(
      expect.objectContaining({
        name: 'device',
        global: true,
        value: 'optional',
      }),
    )
    const echo = tree.commands[2]
    expect(echo.options).toContainEqual(
      expect.objectContaining({ name: 'count', type: 'number', default: 1 }),
    )
  })

  test('describes one command with -h --json', () => {
    const { stdout } = run('echo', '-h', '--json')
    const echo = JSON.parse(stdout)
    expect(echo.path).toBe('structured-fixture echo')
    expect(echo.arguments).toEqual([
      {
        name: 'text',
        description: 'Text to echo',
        required: true,
        variadic: false,
        type: 'string',
      },
    ])
  })

  test('lists examples in text help', () => {
    const { stdout } = run('state', '-h')
    expect(stdout).toContain(
      'Examples:\n  structured-fixture state -d iPhone  State on a device',
    )
  })
})

describe('toErrorShape()', () => {
  test('keeps a CommandError code, exit code and data', () => {
    const error = new CommandError('Busy', {
      code: 'busy',
      exitCode: 4,
      data: { retryInMs: 500 },
    })
    expect(toErrorShape(error)).toEqual({
      code: 'busy',
      message: 'Busy',
      exitCode: 4,
      data: { retryInMs: 500 },
    })
  })
})
