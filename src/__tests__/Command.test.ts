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
    expect(context.args).toEqual(['production', '-v'])
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
    c.command('build | b', 'Build project')

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
    expect(logs[0]).toContain('b, build')
    expect(mockExit).toHaveBeenCalledWith(0)
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
      .a('<env>', 'Target environment')
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
    expect(logs[0]).toContain('--port')
    expect(mockExit).toHaveBeenCalledWith(0)
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
