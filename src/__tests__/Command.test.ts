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

describe('section()', () => {
  test('groups following commands under section headings', () => {
    const c = new Command()
    c.name('myapp')
    c.section('Development')
      .cmd('dev', 'Start development server')
      .add(() => {})
    c.cmd('test', 'Run tests').add(() => {})
    c.section('Release')
    c.cmd('build', 'Build the app').add(() => {})
    c.cmd('deploy', 'Deploy the app').add(() => {})

    expect(c.helpText()).toContain(
      [
        'Commands:',
        '',
        '(Development)',
        '  dev     Start development server',
        '  test    Run tests',
        '',
        '(Release)',
        '  build   Build the app',
        '  deploy  Deploy the app',
      ].join('\n'),
    )
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

  test('lists only first-level commands in help text', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('d, dev', 'Start dev server')
    c.cmd('osm scrape', 'Import from OpenStreetMap')
    c.cmd('osm tags', 'List OSM tags')
    c.cmd('wd, web dev', 'Start web dev server').add(() => {})

    const help = c.helpText()
    expect(help).toMatch(/^ {2}dev\s+d, Start dev server$/m)
    expect(help).toContain('osm <command>')
    expect(help).toContain('web <command>')
    expect(help).not.toContain('scrape')
    expect(help).not.toContain('tags')

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
    expect(help).toContain('web <command>')
  })

  test('shows parent once when it has both an action and subcommands', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('a, ask', 'Ask something').add(() => {})
    c.cmd('ask history', 'Show question history')
    c.cmd('ask clear', 'Clear saved answers')

    const help = c.helpText()
    expect(help).toMatch(/^ {2}ask\s+a, Ask something$/m)
    expect(help).not.toContain('history')
    expect(help).not.toContain('clear')
  })

  test('shows intermediate parent with no description as a group', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('greeting formal', 'Use formal greeting style')

    const help = c.helpText()
    expect(help).toContain('greeting <command>')
    expect(help).not.toContain('formal')
  })

  test('lists subcommands in the parent help', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('greeting formal', 'Use formal greeting style')
    c.cmd('greeting casual', 'Use casual greeting style')

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mock() as any
    await c.parse(['greeting', '-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain('formal')
    expect(logs[0]).toContain('casual')
  })

  test('preserves declaration order in help across interleaved subcommands', () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('a, ask', 'Ask something').add(() => {})
    c.cmd('greeting formal', 'Use formal greeting style')
    c.cmd('build', 'Build project')

    const help = c.helpText()
    const lines = help.split('\n').filter((l) => l.startsWith('  '))
    expect(lines[0]).toContain('ask')
    expect(lines[1]).toContain('greeting <command>')
    expect(lines[2]).toContain('build')
  })

  test('reports an unknown command on stderr with a suggestion', async () => {
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
    await c.parse(['biuld'])
    console.log = origLog
    console.error = origError
    process.exit = origExit

    expect(logs).toEqual([])
    expect(errors[0]).toContain('Unknown command: biuld (did you mean build?)')
    expect(errors[0]).toContain("Run 'myapp -h' for help.")
    expect(mockExit).toHaveBeenCalledWith(2)
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
    expect(logs[0]).toMatch(/^ {2}build <target>\s+b, Build project$/m)
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

  test('prints an argument default and its full choices on their own lines', async () => {
    const c = new Command()
    c.name('myapp', 'My app')
    c.cmd('dev', 'Start apps')
      .add('[app]', {
        completion: ['web', 'server', 'desktop', 'desktop-electrobun-cef'],
        default: 'server and desktop',
      })
      .add(() => {})

    const logs: string[] = []
    const origLog = console.log
    const origExit = process.exit
    console.log = (...args: any[]) => logs.push(args.join(' '))
    process.exit = mock() as any
    await c.parse(['dev', '-h'])
    console.log = origLog
    process.exit = origExit

    expect(logs[0]).toContain(
      '  [app]  default: server and desktop\n         choices: web, server, desktop, desktop-electrobun-cef',
    )
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
    expect(logs[0]).toContain(
      '  <env>  Target environment\n         choices: staging, production',
    )
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
    expect(mockExit).toHaveBeenCalledWith(2)
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
    expect(mockExit).toHaveBeenCalledWith(2)
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
    expect(mockExit).toHaveBeenCalledWith(2)
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
    expect(mockExit).toHaveBeenCalledWith(2)
  })
})

describe('use()', () => {
  test('adds a mixin’s options where use() sits', () => {
    const c = new Command()
    const target = (command: Command) =>
      command.add('-d, --device [name]').add('-p, --port [port]')
    const cmd = c.cmd('state').add('-v, --verbose').use(target)
    expect(cmd.options.map((o) => o.long)).toEqual([
      '--verbose',
      '--device',
      '--port',
    ])
  })

  test('applies several mixins in order, including a factory', async () => {
    const c = new Command()
    const action = mock()
    const target = (command: Command) => command.add('-d, --device [name]')
    const wait =
      ({ timeout }: { timeout: number }) =>
      (command: Command) =>
        command.add(`-t, --timeout [ms:number=${timeout}]`)
    c.cmd('open')
      .add('<screen>')
      .use(target, wait({ timeout: 5000 }))
      .add(action)

    await c.parse(['open', 'Home', '-d', 'iPhone'])

    const [screen, options] = action.mock.calls[0]
    expect(screen).toBe('Home')
    expect(options.device).toBe('iPhone')
    expect(options.timeout).toBe(5000)
  })
})

describe('global()', () => {
  test('passes inherited options to a command that declares none', async () => {
    const c = new Command()
    const action = mock()
    c.global('-d, --device [name]', 'Device')
    c.cmd('accounts', 'List accounts').add(action)

    await c.parse(['accounts', '-d', 'iPhone'])

    const [options, context] = action.mock.calls[0]
    expect(options.device).toBe('iPhone')
    expect(context.argv).toEqual(['-d', 'iPhone'])
  })

  test('accepts global options before the command name', async () => {
    const c = new Command()
    const action = mock()
    c.global('-d, --device [name]').global('-p, --port <port:number>')
    c.cmd('state').add('-v, --verbose').add(action)

    await c.parse(['-d', 'iPhone', '-p', '8082', 'state', '-v'])

    const [options] = action.mock.calls[0]
    expect(options).toMatchObject({
      device: 'iPhone',
      port: 8082,
      verbose: true,
    })
  })

  test('does not take a command name as an optional value', async () => {
    const c = new Command()
    const action = mock()
    c.global('-d, --device [name]')
    c.cmd('state').add(action)

    await c.parse(['-d', 'state'])

    const [options] = action.mock.calls[0]
    expect(options.device).toBe(true)
  })

  test('reaches nested subcommands through every level', async () => {
    const c = new Command()
    const action = mock()
    c.global('-d, --device [name]')
    c.cmd('wallet').global('-a, --account [name]')
    c.cmd('wallet send').add('<to>').add(action)

    await c.parse(['-d', 'iPhone', 'wallet', '-a', 'exodus_1', 'send', 'x'])

    const [to, options] = action.mock.calls[0]
    expect(to).toBe('x')
    expect(options).toMatchObject({ device: 'iPhone', account: 'exodus_1' })
  })

  test('lets a command’s own option replace a clashing global', async () => {
    const c = new Command()
    const action = mock()
    c.global('-d, --device [name]')
    c.cmd('send').add('-d, --dry-run').add(action)

    await c.parse(['send', '-d'])

    const [options] = action.mock.calls[0]
    expect(options.dryRun).toBe(true)
    expect(options.device).toBeUndefined()
  })

  test('lists inherited options under Global Options', () => {
    const c = new Command()
    c.name('appctl')
    c.global('-d, --device [name]', 'Device')
    const state = c.cmd('state', 'Show state').add('-v, --verbose', 'Verbose')

    expect(c.helpText()).toMatch(
      /Global Options:\n {2}-d, --device \[name\] {2}Device/,
    )
    const help = state.helpText()
    expect(help).toMatch(/Options:\n {2}-v, --verbose {2}Verbose/)
    expect(help).toMatch(/Global Options:\n {2}-d, --device \[name\] {2}Device/)
  })

  test('emits persistent flags for completion', () => {
    const c = new Command()
    c.name('appctl')
    c.global('-d, --device [name]', 'Device', ['ios', 'android'])
    c.cmd('state', 'Show state')

    const spec = buildSpecText(c)?.spec
    expect(spec?.persistentflags).toEqual({ '-d, --device=': 'Device' })
    expect(spec?.completion?.flag).toEqual({ device: ['ios', 'android'] })
  })

  test('rejects a non-option', () => {
    expect(() => new Command().global('<name>')).toThrow(
      'global() takes an option',
    )
  })
})

describe('usage errors', () => {
  test('a typo in a declared option exits with help and a suggestion', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('send').add('<to>').add('-n, --dry-run').add(action)

    const { errors, exitCode } = await parseCapturingExit(c, [
      'send',
      'x',
      '--dry-rn',
    ])

    expect(action).not.toHaveBeenCalled()
    expect(errors[0]).toContain(
      'Unknown option: --dry-rn (did you mean --dry-run?)',
    )
    expect(exitCode).toBe(2)
  })

  test('an extra positional exits with an error', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('send').add('<to>').add(action)

    const { errors, exitCode } = await parseCapturingExit(c, [
      'send',
      'x',
      'extra',
    ])

    expect(action).not.toHaveBeenCalled()
    expect(errors[0]).toContain('Unexpected argument: extra')
    expect(exitCode).toBe(2)
  })

  test('an invalid option choice exits with an error', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('run').add('--mode [mode]', 'Mode', ['fast', 'slow']).add(action)

    const { errors, exitCode } = await parseCapturingExit(c, [
      'run',
      '--mode',
      'bogus',
    ])

    expect(action).not.toHaveBeenCalled()
    expect(errors[0]).toContain(
      "Invalid value for --mode: 'bogus' (expected: fast, slow)",
    )
    expect(exitCode).toBe(2)
  })

  test('--help prints help instead of running the command', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('send', 'Send').add('<to>').add(action)

    const { logs, exitCode } = await parseCapturingExit(c, [
      'send',
      'x',
      '--help',
    ])

    expect(action).not.toHaveBeenCalled()
    expect(logs[0]).toContain('Usage: send <to>')
    expect(exitCode).toBe(0)
  })

  test('a command that declares nothing still forwards any argv', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('t').add(action)

    await c.parse(['t', '--watch', 'src/foo.test.ts'])

    const [context] = action.mock.calls[0]
    expect(context.argv).toEqual(['--watch', 'src/foo.test.ts'])
  })

  test('a forwarding default command passes -h through', async () => {
    const c = new Command()
    const action = mock()
    c.cmd('build')
    c.cmd().add(action)

    await c.parse(['lint', '-h'])

    const [context] = action.mock.calls[0]
    expect(context.argv).toEqual(['lint', '-h'])
  })
})

async function parseCapturingExit(command: Command, argv: string[]) {
  const logs: string[] = []
  const errors: string[] = []
  let exitCode: number | undefined
  const origLog = console.log
  const origError = console.error
  const origExit = process.exit
  console.log = (...args: any[]) => logs.push(args.join(' '))
  console.error = (...args: any[]) => errors.push(args.join(' '))
  process.exit = ((code?: number) => {
    exitCode ??= code
  }) as any
  try {
    await command.parse(argv)
  } finally {
    console.log = origLog
    console.error = origError
    process.exit = origExit
  }
  return { logs, errors, exitCode }
}
