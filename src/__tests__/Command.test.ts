import { describe, expect, mock, test } from 'bun:test'
import { Command } from '../Command'
import { buildSpecText } from '../completion'

describe('name()', () => {
  test('sets name and description', () => {
    const c = new Command()
    c.name('m, myapp', 'My application')
    expect(c._name).toBe('myapp')
    expect(c.description).toBe('My application')
    expect(c.aliases).toEqual(['m'])
  })
})

describe('command()', () => {
  test('creates subcommand and adds to commands list', () => {
    const c = new Command()
    const sub = c.cmd('d, deploy', 'Deploy app')
    expect(sub._name).toBe('deploy')
    expect(sub.aliases).toEqual(['d'])
    expect(sub.description).toBe('Deploy app')
    expect(c.commands).toHaveLength(1)
    expect(c.commands[0]).toBe(sub)
  })

  test('space-separated name creates nested subcommands', () => {
    const c = new Command()
    const world = c.cmd('hello world', 'Greet the world')
    expect(world._name).toBe('world')
    expect(world.description).toBe('Greet the world')
    expect(c.commands).toHaveLength(1)
    expect(c.commands[0]._name).toBe('hello')
    expect(c.commands[0].commands).toHaveLength(1)
    expect(c.commands[0].commands[0]).toBe(world)
  })
})

describe('cmdHide()', () => {
  test('hides from help but remains executable', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    const action = mock()
    c.cmd('build', 'Build project')
    c.cmdHide('secret', 'Secret command').add(action)

    const help = c.helpText()
    expect(help).toContain('build')
    expect(help).not.toContain('secret')

    const spec = buildSpecText(c)?.text
    expect(spec).toContain('build')
    expect(spec).not.toContain('secret')

    await c.parse(['secret'])
    expect(action).toHaveBeenCalledTimes(1)
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
    c.add('-v, --verbose', 'Verbose output')
    expect(c.options).toHaveLength(1)
    expect(c.options[0].long).toBe('--verbose')
  })

  test('registers action when given a function', () => {
    const c = new Command()
    const fn = () => {}
    c.add(fn)
    expect(c.action).toBe(fn)
  })

  test('chains with .add()', () => {
    const c = new Command()
    c.add('<name>').add('-v, --verbose')
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
    c.cmd('build', 'Build project')
      .add('<target>')
      .add('-v, --verbose')
      .add(action)

    await c.parse(['build', 'production', '-v'])

    expect(action).toHaveBeenCalledTimes(1)
    const [target, options, context] = action.mock.calls[0]
    expect(target).toBe('production')
    expect(options.verbose).toBe(true)
    expect(context.argv).toEqual(['production', '-v'])
  })

  test('dispatches to matching command by alias', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('b, build', 'Build').add(action)

    await c.parse(['b'])
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('dispatches to subcommand', async () => {
    const c = new Command()
    const action = mock()
    const build = c.cmd('build', 'Build')
    build.cmd('xcode', 'Build with Xcode').add('<config>').add(action)

    await c.parse(['build', 'xcode', 'release'])

    expect(action).toHaveBeenCalledTimes(1)
    const [config] = action.mock.calls[0]
    expect(config).toBe('release')
  })

  test('flattens nested subcommands in help text', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('d, dev', 'Start dev server')
    c.cmd('osm scrape', 'Import from OpenStreetMap')
    c.cmd('osm tags', 'List OSM tags')
    c.cmd('wd, web dev', 'Start web dev server').add(() => {})

    const help = c.helpText()
    expect(help).toContain('d, dev')
    expect(help).toContain('osm scrape')
    expect(help).toContain('osm tags')
    expect(help).toContain('wd, web dev')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['osm', '-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('scrape')
    expect(logs[0]).toContain('tags')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('runs parent action when command has both action and subcommands', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('a, ask', 'Ask something').add(action)
    c.cmd('ask history', 'Show question history')

    await c.parse(['ask'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('runs parent action with args when no subcommand matches', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('ask', 'Ask something').add('<name>').add(action)
    c.cmd('ask history', 'Show question history')

    await c.parse(['ask', 'bob'])

    expect(action).toHaveBeenCalledTimes(1)
    expect(action.mock.calls[0][0]).toBe('bob')
  })

  test('shortcut aliases work for subcommands with spaces', async () => {
    const c = new Command()
    c.name('myapp')
    const action = mock()
    c.cmd('wd, web d, dev', 'Start web dev server').add(action)

    await c.parse(['wd'])
    expect(action).toHaveBeenCalledTimes(1)

    action.mockClear()
    await c.parse(['web', 'd'])
    expect(action).toHaveBeenCalledTimes(1)

    action.mockClear()
    await c.parse(['web', 'dev'])
    expect(action).toHaveBeenCalledTimes(1)

    const help = c.helpText()
    expect(help).toContain('wd, web d, web dev')
  })

  test('includes parent command in help when it has description or action', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('a, ask', 'Ask something').add(() => {})
    c.cmd('ask history', 'Show question history')
    c.cmd('ask clear', 'Clear saved answers')

    const help = c.helpText()
    expect(help).toContain('a, ask')
    expect(help).toContain('Ask something')
    expect(help).toContain('ask history')
    expect(help).toContain('ask clear')
  })

  test('omits intermediate parent with no description or action from help', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('greeting formal', 'Use formal greeting style')

    const help = c.helpText()
    expect(help).toContain('greeting formal')
    expect(help).not.toMatch(/^\s+greeting\s+$/m)
  })

  test('preserves declaration order in help across interleaved subcommands', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('a, ask', 'Ask something').add(() => {})
    c.cmd('greeting formal', 'Use formal greeting style')
    c.cmd('ask history', 'Show question history')
    c.cmd('ask clear', 'Clear saved answers')

    const help = c.helpText()
    const lines = help.split('\n').filter((l) => l.startsWith('  '))
    expect(lines[0]).toContain('a, ask')
    expect(lines[1]).toContain('greeting formal')
    expect(lines[2]).toContain('ask history')
    expect(lines[3]).toContain('ask clear')
  })

  test('prints help and error when command not found', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('b, build', 'Build project')

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['nonexistent'])
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
    c.name('myapp', 'My app')
    c.cmd('b, build', 'Build project').add('<target>')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.parse([])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('b, build <target>')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('appends extra help text from help(text)', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('build', 'Build project')
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
    await c.parse([])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('Examples:')
    expect(logs[0]).toContain('myapp build')
    expect(logs[0]).not.toMatch(/\n\s+$/)
  })

  test('prints help when -h flag is passed', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('build', 'Build project')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('build')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('prints command help when command -h is passed', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('deploy', 'Deploy app')
      .add('<env>', 'Target environment', ['staging', 'production'])
      .add('-p, --port <n>', 'Port number')
      .add(() => {})

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['deploy', '-h'])
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
    c.cmd('build', 'Build project')
    c.cmd().add(action)

    await c.parse([])

    expect(action).toHaveBeenCalledTimes(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual([])
  })

  test('runs default command with optional args when no arguments provided', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('build', 'Build project')
    c.cmd().add('[target]').add(action)

    await c.parse([])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('shows help when default command has required args and no arguments provided', async () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('build', 'Build project')
    c.cmd()
      .add('<target>')
      .add(() => {})

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mockExit
    await c.parse([])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('myapp')
    expect(logs[0]).toContain('build')
    expect(mockExit).toHaveBeenCalledWith(0)
  })

  test('falls through to default command when command not found', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('build', 'Build project')
    c.cmd().add(action)

    await c.parse(['unknown-cmd', '--foo'])

    expect(action).toHaveBeenCalledTimes(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual(['unknown-cmd', '--foo'])
  })

  test('includes default command args in help commands list', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('build', 'Build project')
    c.cmd()
      .add('<target>', 'Deploy target', ['staging', 'prod'])
      .add('--verbose', 'Verbose output')
      .add(() => {})

    const help = c.helpText()
    expect(help).toContain('build')
    expect(help).toContain('<target>')
    expect(help).toContain('(staging, prod)')
    expect(help).toContain('Default Command Options:')
    expect(help).toContain('--verbose')
  })

  test('passes only context when command has no arguments or options', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('run', 'Run it').add(action)

    await c.parse(['run'])

    expect(action).toHaveBeenCalledTimes(1)
    expect(action.mock.calls[0]).toHaveLength(1)
    const [ctx] = action.mock.calls[0]
    expect(ctx.argv).toEqual([])
  })

  test('passes parsed positionals and options to action', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('deploy', 'Deploy')
      .add('<env>')
      .add('[...files]')
      .add('-p, --port <n>')
      .add(action)

    await c.parse(['deploy', 'staging', 'a.js', 'b.js', '--port', '8080'])

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
    c.cmd('build', 'Build').add('<target>').add(action)

    await c.invoke('build production')

    expect(action).toHaveBeenCalledTimes(1)
    const [target] = action.mock.calls[0]
    expect(target).toBe('production')
  })

  test('calls command action directly with args', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('build', 'Build').add(action)

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
    c.cmd('open', 'Open')
      .add('<platform>', 'Platform', ['ios', 'android'])
      .add(() => {})

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['open', 'web'])
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
    c.cmd('open', 'Open')
      .add('<platform>', 'Platform', ['ios', 'android'])
      .add(action)

    await c.parse(['open', 'ios'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('validates key part of key\\tdescription format', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('run', 'Run')
      .add('<mode>', 'Mode', [
        '+full\tfull mode, 120s',
        '+quick\tquick mode, 30s',
        'country:GB\tmock geolocation',
      ])
      .add(action)

    await c.parse(['run', 'country:GB'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('errors with key-only message for key\\tdescription format', async () => {
    const c = new Command()
    c.cmd('run', 'Run')
      .add('<mode>', 'Mode', ['+full\tfull mode', '+quick\tquick mode'])
      .add(() => {})

    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = () => {}
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['run', 'invalid'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(errors[0]).toContain("Invalid value for mode: 'invalid'")
    expect(errors[0]).toContain('+full, +quick')
    expect(errors[0]).not.toContain('full mode')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test('skips validation for macros like $files', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('open', 'Open').add('<file>', 'File', ['$files']).add(action)

    await c.parse(['open', 'anything.txt'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('skips validation for function completions', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('open', 'Open')
      .add('<target>', 'Target', () => ['a', 'b'])
      .add(action)

    await c.parse(['open', 'c'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('skips validation when no choices defined', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('open', 'Open').add('<url>', 'URL').add(action)

    await c.parse(['open', 'https://example.com'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('errors when required option value is missing', async () => {
    const c = new Command()
    c.cmd('run', 'Run')
      .add('-d, --device <device>', 'Device')
      .add(() => {})

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['run', '--device'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(errors[0]).toContain('Missing required value for option')
    expect(errors[0]).toContain('--device')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test('passes when required option has value', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('run', 'Run').add('-d, --device <device>', 'Device').add(action)

    await c.parse(['run', '--device', 'iphone'])

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('errors when required argument is missing', async () => {
    const c = new Command()
    c.cmd('greet', 'Greet')
      .add('<name>', 'Name')
      .add(() => {})

    const logs: string[] = []
    const errors: string[] = []
    const origLog = console.log
    const origError = console.error
    const origExit = process.exit
    const mockExit = mock() as any
    console.log = (...args: any[]) => logs.push(args.join(' '))
    console.error = (...args: any[]) => errors.push(args.join(' '))
    process.exit = mockExit
    await c.parse(['greet'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(errors[0]).toContain('Missing required argument: <name>')
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
