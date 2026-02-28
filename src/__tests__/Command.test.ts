import { describe, expect, mock, test } from 'bun:test'
import { Command, app, cmd } from '../Command'

describe('meta()', () => {
  test('sets name and description', () => {
    const c = new Command()
    c.meta('myapp | m', 'My application')
    expect(c.name).toBe('myapp')
    expect(c.description).toBe('My application')
    expect(c.aliases).toEqual(['m'])
  })
})

describe('command()', () => {
  test('creates subcommand and adds to commands list', () => {
    const c = new Command()
    const sub = c.command('deploy | d', 'Deploy app')
    expect(sub.name).toBe('deploy')
    expect(sub.aliases).toEqual(['d'])
    expect(sub.description).toBe('Deploy app')
    expect(c.commands).toHaveLength(1)
    expect(c.commands[0]).toBe(sub)
  })
})

describe('add()', () => {
  test('registers an argument when name has angle brackets', () => {
    const c = new Command()
    c.add('<platform>', 'Platform', ['ios', 'android'])
    expect(c.arguments).toHaveLength(1)
    expect(c.arguments[0].name).toBe('platform')
    expect(c.arguments[0].completion).toEqual(['ios', 'android'])
  })

  test('registers an option when name starts with dash', () => {
    const c = new Command()
    c.add('-v | --verbose', 'Verbose output')
    expect(c.options).toHaveLength(1)
    expect(c.options[0].long).toBe('--verbose')
  })

  test('registers action when given a function', () => {
    const c = new Command()
    const fn = () => {}
    c.add(fn)
    expect(c.action).toBe(fn)
  })

  test('chains with .a() shorthand', () => {
    const c = new Command()
    c.a('<name>').a('-v | --verbose')
    expect(c.arguments).toHaveLength(1)
    expect(c.options).toHaveLength(1)
  })

  test('allows omitting description (second arg becomes completionOrDefault)', () => {
    const c = new Command()
    c.add('<platform>', ['ios', 'android'])
    expect(c.arguments[0].description).toBe('')
    expect(c.arguments[0].completion).toEqual(['ios', 'android'])
  })

  test('throws when description is non-string and third arg also provided', () => {
    const c = new Command()
    expect(() => c.add('<platform>', ['ios'], 'extra')).toThrow(
      'Invalid third argument',
    )
  })
})

describe('run()', () => {
  test('dispatches to matching command by name', async () => {
    const c = new Command()
    const action = mock()
    c.command('build', 'Build project')
      .a('<target>')
      .a('-v | --verbose')
      .a(action)

    await c.run(['build', 'production', '-v'])

    expect(action).toHaveBeenCalledTimes(1)
    const [target, options, context] = action.mock.calls[0]
    expect(target).toBe('production')
    expect(options.verbose).toBe(true)
    expect(context.argv).toEqual(['production', '-v'])
  })

  test('dispatches to matching command by alias', async () => {
    const c = new Command()
    const action = mock()
    c.command('build | b', 'Build').a(action)

    await c.run(['b'])
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('prints help and error when command not found', async () => {
    const c = new Command()
    c.meta('myapp', 'My app')
    c.command('build | b', 'Build project')

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.run(['nonexistent'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('b, build')
    expect(errors[0]).toContain('Unknown command: nonexistent')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test('prints help when no arguments provided', async () => {
    const c = new Command()
    c.meta('myapp', 'My app')
    c.command('build | b', 'Build project').a('<target>')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.run([])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('b, build <target>')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('appends extra help text from help(text)', async () => {
    const c = new Command()
    c.meta('myapp', 'My app')
    c.command('build', 'Build project')
    c.help(`
Examples:
  myapp build
    `)

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.run([])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('Examples:')
    expect(logs[0]).toContain('myapp build')
    expect(logs[0]).not.toMatch(/\n\s+$/)
  })

  test('prints help when -h flag is passed', async () => {
    const c = new Command()
    c.meta('myapp', 'My app')
    c.command('build', 'Build project')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.run(['-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('build')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('prints command help when command -h is passed', async () => {
    const c = new Command()
    c.meta('myapp', 'My app')
    c.command('deploy', 'Deploy app')
      .a('<env>', 'Target environment', ['staging', 'production'])
      .a('-p | --port <n>', 'Port number')
      .a(() => {})

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.run(['deploy', '-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('deploy')
    expect(logs[0]).toContain('env')
    expect(logs[0]).toContain('(staging, production)')
    expect(logs[0]).toContain('--port')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('runs default command when no arguments provided', async () => {
    const c = new Command()
    const action = mock()
    c.command('build', 'Build project')
    c.command().a(action)

    await c.run([])

    expect(action).toHaveBeenCalledTimes(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual([])
  })

  test('falls through to default command when command not found', async () => {
    const c = new Command()
    const action = mock()
    c.command('build', 'Build project')
    c.command().a(action)

    await c.run(['unknown-cmd', '--foo'])

    expect(action).toHaveBeenCalledTimes(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual(['unknown-cmd', '--foo'])
  })

  test('passes only context when command has no arguments or options', async () => {
    const c = new Command()
    const action = mock()
    c.command('run', 'Run it').a(action)

    await c.run(['run'])

    expect(action).toHaveBeenCalledTimes(1)
    expect(action.mock.calls[0]).toHaveLength(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual([])
  })

  test('passes parsed positionals and options to action', async () => {
    const c = new Command()
    const action = mock()
    c.command('deploy', 'Deploy')
      .a('<env>')
      .a('[...files]')
      .a('-p | --port <n>')
      .a(action)

    await c.run(['deploy', 'staging', 'a.js', 'b.js', '--port', '8080'])

    const [env, files, options] = action.mock.calls[0]
    expect(env).toBe('staging')
    expect(files).toEqual(['a.js', 'b.js'])
    expect(options.port).toBe('8080')
  })
})

describe('invoke()', () => {
  test('parses string as argv and runs command', async () => {
    const c = new Command()
    const action = mock()
    c.command('build', 'Build').a('<target>').a(action)

    await c.invoke('build production')

    expect(action).toHaveBeenCalledTimes(1)
    const [target] = action.mock.calls[0]
    expect(target).toBe('production')
  })

  test('calls command action directly with args', async () => {
    const c = new Command()
    const action = mock()
    c.command('build', 'Build').a(action)

    await c.invoke('build', 'arg1', 'arg2')

    expect(action).toHaveBeenCalledWith('arg1', 'arg2')
  })

  test('throws on unknown command', async () => {
    const c = new Command()
    expect(c.invoke('nonexistent', 'arg')).rejects.toThrow(
      'Unknown command: nonexistent',
    )
  })
})

describe('choices validation', () => {
  test('errors when value not in choices', async () => {
    const c = new Command()
    c.command('open', 'Open')
      .a('<platform>', 'Platform', ['ios', 'android'])
      .a(() => {})

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.run(['open', 'web'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(errors[0]).toContain("Invalid value for platform: 'web'")
    expect(errors[0]).toContain('ios, android')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test('passes when value is in choices', async () => {
    const c = new Command()
    const action = mock()
    c.command('open', 'Open')
      .a('<platform>', 'Platform', ['ios', 'android'])
      .a(action)

    await c.run(['open', 'ios'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('skips validation for macros like $files', async () => {
    const c = new Command()
    const action = mock()
    c.command('open', 'Open')
      .a('<file>', 'File', ['$files'])
      .a(action)

    await c.run(['open', 'anything.txt'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('skips validation for function completions', async () => {
    const c = new Command()
    const action = mock()
    c.command('open', 'Open')
      .a('<target>', 'Target', () => ['a', 'b'])
      .a(action)

    await c.run(['open', 'c'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('skips validation when no choices defined', async () => {
    const c = new Command()
    const action = mock()
    c.command('open', 'Open')
      .a('<url>', 'URL')
      .a(action)

    await c.run(['open', 'https://example.com'])

    expect(action).toHaveBeenCalledTimes(1)
  })
})
