import { describe, expect, test } from 'bun:test'

const script = new URL('../script.ts', import.meta.url).pathname
const fixture = new URL('./fixtures/output.ts', import.meta.url).pathname
function run(...args: string[]) {
  const result = Bun.spawnSync(['bun', script, fixture, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, CARAPACE_SPECS_DIR: '/tmp/script-output-specs' },
  })
  return {
    stdout: result.stdout.toString().trimEnd(),
    rawStdout: result.stdout.toString(),
    stderr: result.stderr.toString().trimEnd(),
    exitCode: result.exitCode,
  }
}

describe('default command output', () => {
  test('renders returned data for people and raw data as JSON without opting in', () => {
    expect(run('rows').stdout).toContain('╭')
    for (const args of [
      ['rows', '--json'],
      ['--json', 'rows'],
    ]) {
      const result = run(...args)
      expect(result.exitCode).toBe(0)
      expect(JSON.parse(result.stdout)).toEqual([
        { name: 'demo', path: '/example' },
      ])
    }
    expect(run('record').stdout).toContain('demo')
    expect(run('lines').stdout).toBe('first\nsecond')
    expect(JSON.parse(run('lines', '--json').stdout)).toEqual([
      'first',
      'second',
    ])
  })
  test('composes flat string arrays with sections and one trailing newline while JSON bypasses presentation', () => {
    const result = run('composed')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toStartWith('Before\n\n╭')
    expect(result.stdout).toContain('demo')
    expect(result.stdout).toContain('count')
    expect(result.stdout).toContain('Summary\n╭')
    expect(result.stdout).toContain('Count: 1')
    expect(result.stdout).not.toContain('Hidden')
    expect(result.stdout).toEndWith('first\nsecond\n\nAfter\n\nTotal: 1')
    expect(result.stdout).not.toContain('\x1b[')
    expect(result.rawStdout).toBe(`${result.stdout}\n`)
    expect(run('blank-renderer').rawStdout).toBe('')
    expect(JSON.parse(run('composed', '--json').stdout)).toEqual({
      entries: [{ name: 'demo' }],
      count: 1,
    })
    const invalid = run('invalid-renderer')
    expect(invalid.exitCode).toBe(1)
    expect(invalid.stdout).toBe('')
    expect(invalid.stderr).toContain('must return a string')
    expect(JSON.parse(run('invalid-renderer', '--json').stdout)).toEqual({
      ok: true,
    })
  })
  test('flushes large returned results completely to a pipe', () => {
    const json = Bun.spawnSync(
      [
        'sh',
        '-c',
        '"$@" | cat',
        'output-test',
        'bun',
        script,
        fixture,
        'large',
        '--json',
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, CARAPACE_SPECS_DIR: '/tmp/script-output-specs' },
      },
    )
    expect(json.exitCode).toBe(0)
    expect(JSON.parse(json.stdout.toString()).data).toHaveLength(2000000)
    expect(run('large').rawStdout).toHaveLength(2000001)
    expect(run('large-after-print').rawStdout).toHaveLength(2000010)
  })
  test('preserves printed text normally and captures it as a JSON fallback', () => {
    expect(run('printed').stdout).toBe('hello')
    expect(JSON.parse(run('printed', '--json').stdout)).toEqual({
      stdout: 'hello\n',
    })
    const mixed = run('mixed', '--json')
    expect(JSON.parse(mixed.stdout)).toEqual({ ok: true })
    expect(mixed.stderr).toContain('progress')
    expect(JSON.parse(run('empty', '--json').stdout)).toBeNull()
    expect(run('empty-rows').stdout).toBe('')
    expect(JSON.parse(run('empty-rows', '--json').stdout)).toEqual([])
  })
  test('captures shell wrappers without appending shell metadata in normal output', () => {
    expect(run('shell').stdout).toBe('shell output')
    expect(JSON.parse(run('shell', '--json').stdout)).toEqual({
      stdout: 'shell output\n',
      exitCode: 0,
    })
    expect(JSON.parse(run('unawaited-shell', '--json').stdout)).toEqual({
      stdout: 'background output\n',
    })
  })
  test('keeps handler signatures and forwarding intact, including the -- boundary', () => {
    const result = run('forward', '--json', '-x', 'value', '--', '--json')
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      argv: ['-x', 'value', '--', '--json'],
      json: true,
    })
    expect(run('value', '--value', '--json').stdout).toBe('--json')
  })
  test('reports action, usage, shell, and process-exit errors as JSON', () => {
    for (const [args, code, exitCode] of [
      [['fail', '--json'], 'unavailable', 1],
      [['value', '--value', 'demo', '--json', '--typo'], 'usage', 2],
      [['--json', 'missing'], 'unknown_command', 2],
      [['shell-fail', '--json'], 'shell_failed', 3],
      [['unawaited-fail', '--json'], 'shell_failed', 4],
      [['exit', '--json'], 'process_exit', 3],
      [['invalid', '--json'], 'invalid_result', 1],
    ] as const) {
      const result = run(...args)
      expect(result.stdout).toBe('')
      expect(result.exitCode).toBe(exitCode)
      expect(JSON.parse(result.stderr).error.code).toBe(code)
    }
  })
  test('advertises JSON support for every command without changing passthrough status', () => {
    const tree = JSON.parse(run('--help', '--json').stdout)
    expect(JSON.parse(run('--json', '--help').stdout)).toEqual(tree)
    const forward = tree.commands.find(
      (command: any) => command.name === 'forward',
    )
    expect(forward.passThrough).toBe(true)
    expect(forward.options).toContainEqual(
      expect.objectContaining({ name: 'json', global: true }),
    )
    expect(run('rows', '--help').stdout).toContain('--json')
  })
})
