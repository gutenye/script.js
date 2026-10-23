import { describe, expect, test } from 'bun:test'
import { Argument } from '../Argument'
import { Option } from '../Option'
import { parseArgv, wantsHelp } from '../parseArgv'

describe('parseArgv', () => {
  test('parses positional arguments', () => {
    const args = [new Argument('<platform>'), new Argument('[port]')]
    const result = parseArgv(['ios', '3000'], args, [])
    expect(result.positionals).toEqual(['ios', '3000'])
  })

  test('missing optional positional is undefined', () => {
    const args = [new Argument('<platform>'), new Argument('[port]')]
    const result = parseArgv(['ios'], args, [])
    expect(result.positionals).toEqual(['ios', undefined])
  })

  test('variadic collects remaining positionals', () => {
    const args = [new Argument('<dir>'), new Argument('[...files]')]
    const result = parseArgv(['src', 'a.ts', 'b.ts'], args, [])
    expect(result.positionals).toEqual(['src', ['a.ts', 'b.ts']])
  })

  test('empty variadic is empty array', () => {
    const args = [new Argument('<dir>'), new Argument('[...files]')]
    const result = parseArgv(['src'], args, [])
    expect(result.positionals).toEqual(['src', []])
  })

  test('parses boolean flag', () => {
    const opts = [new Option('-l, --long')]
    const result = parseArgv(['-l'], [], opts)
    expect(result.options.long).toBe(true)
  })

  test('absent boolean flag is undefined', () => {
    const opts = [new Option('-l, --long')]
    const result = parseArgv([], [], opts)
    expect(result.options.long).toBeUndefined()
  })

  test('parses negate flag --no-color', () => {
    const opts = [new Option('--no-color')]
    const result = parseArgv(['--no-color'], [], opts)
    expect(result.options.color).toBe(false)
  })

  test('negate flag default is true', () => {
    const opts = [new Option('--no-color')]
    const result = parseArgv([], [], opts)
    expect(result.options.color).toBe(true)
  })

  test('parses option with required value', () => {
    const opts = [new Option('-p, --port <number>')]
    const result = parseArgv(['--port', '8080'], [], opts)
    expect(result.options.port).toBe('8080')
  })

  test('parses option with required value using short flag', () => {
    const opts = [new Option('-p, --port <number>')]
    const result = parseArgv(['-p', '8080'], [], opts)
    expect(result.options.port).toBe('8080')
  })

  test('parses --flag=value syntax', () => {
    const opts = [new Option('-p, --port <number>')]
    const result = parseArgv(['--port=8080'], [], opts)
    expect(result.options.port).toBe('8080')
  })

  test('parses option with optional value', () => {
    const opts = [new Option('-o, --output [file]')]
    const result = parseArgv(['--output', 'out.txt'], [], opts)
    expect(result.options.output).toBe('out.txt')
  })

  test('option with optional value and no value gives true', () => {
    const opts = [new Option('-o, --output [file]')]
    const result = parseArgv(['--output'], [], opts)
    expect(result.options.output).toBe(true)
  })

  test('option with optional value and inline default gives default when flag present without value', () => {
    const opts = [new Option('--limit [price=0.01]')]
    const result = parseArgv(['--limit'], [], opts)
    expect(result.options.limit).toBe('0.01')
  })

  test('uses default value when option absent', () => {
    const opts = [new Option('-o, --output [file]', '', 'default.txt')]
    const result = parseArgv([], [], opts)
    expect(result.options.output).toBe('default.txt')
  })

  test('uses inline default from [value=default] when option absent', () => {
    const opts = [new Option('-o, --output [file=out.txt]')]
    const result = parseArgv([], [], opts)
    expect(result.options.output).toBe('out.txt')
  })

  test('mixes positionals and options', () => {
    const args = [new Argument('<dir>')]
    const opts = [new Option('-v, --verbose'), new Option('-p, --port <n>')]
    const result = parseArgv(['src', '-v', '--port', '3000'], args, opts)
    expect(result.positionals).toEqual(['src'])
    expect(result.options.verbose).toBe(true)
    expect(result.options.port).toBe('3000')
  })

  test('-- stops option parsing', () => {
    const args = [new Argument('<cmd>'), new Argument('[...rest]')]
    const opts = [new Option('-v, --verbose')]
    const result = parseArgv(['echo', '--', '-v', 'hello'], args, opts)
    expect(result.positionals).toEqual(['echo', ['-v', 'hello']])
    expect(result.options.verbose).toBeUndefined()
  })

  describe('$has', () => {
    test('returns true for explicitly provided options', () => {
      const opts = [new Option('-v, --verbose'), new Option('-p, --port <n>')]
      const result = parseArgv(['-v', '--port', '8080'], [], opts)
      expect(result.options.$has('verbose')).toBe(true)
      expect(result.options.$has('port')).toBe(true)
    })

    test('returns false for absent options', () => {
      const opts = [new Option('-v, --verbose'), new Option('-p, --port <n>')]
      const result = parseArgv(['-v'], [], opts)
      expect(result.options.$has('verbose')).toBe(true)
      expect(result.options.$has('port')).toBe(false)
    })

    test('distinguishes default from explicit for optional value with inline default', () => {
      const opts = [new Option('--long [long=0.1]')]
      const absent = parseArgv([], [], opts)
      expect(absent.options.long).toBe('0.1')
      expect(absent.options.$has('long')).toBe(false)

      const present = parseArgv(['--long'], [], opts)
      expect(present.options.long).toBe('0.1')
      expect(present.options.$has('long')).toBe(true)
    })

    test('returns true for negate flags', () => {
      const opts = [new Option('--no-color')]
      const result = parseArgv(['--no-color'], [], opts)
      expect(result.options.$has('color')).toBe(true)
    })

    test('returns false when no options provided', () => {
      const opts = [new Option('-v, --verbose')]
      const result = parseArgv([], [], opts)
      expect(result.options.$has('verbose')).toBe(false)
    })
  })

  describe('variadic options', () => {
    test('collect values until the next flag', () => {
      const opts = [new Option('-a, --array [values...]'), new Option('-v')]
      const result = parseArgv(['-a', '1', '2', '-v'], [], opts)
      expect(result.options.array).toEqual(['1', '2'])
      expect(result.options.v).toBe(true)
    })

    test('accumulate across repeats', () => {
      const opts = [new Option('-a, --array [values...]')]
      const result = parseArgv(['-a', '1', '--array=2', '-a', '3'], [], opts)
      expect(result.options.array).toEqual(['1', '2', '3'])
    })

    test('leave a required variadic option without values unset', () => {
      const opts = [new Option('-a, --array <values...>')]
      const result = parseArgv(['-a'], [], opts)
      expect(result.options.array).toBeUndefined()
    })
  })

  describe('typed values', () => {
    test('convert number and json values', () => {
      const args = [
        new Argument('<amount:number>'),
        new Argument('[params:json]'),
      ]
      const opts = [new Option('-t, --timeout [ms:number=10000]')]
      const result = parseArgv(['1.5', '{"a":1}', '-t', '250'], args, opts)
      expect(result.positionals).toEqual([1.5, { a: 1 }])
      expect(result.options.timeout).toBe(250)
    })

    test('convert inline and argument defaults', () => {
      const args = [new Argument('[depth:number=6]')]
      const opts = [new Option('-t, --timeout [ms:number=10000]')]
      const result = parseArgv([], args, opts)
      expect(result.positionals).toEqual([6])
      expect(result.options.timeout).toBe(10000)
    })

    test('throw a usage error for an invalid number', () => {
      const opts = [new Option('-t, --timeout <ms:number>')]
      expect(() => parseArgv(['-t', 'soon'], [], opts)).toThrow(
        "Invalid number for --timeout: 'soon'",
      )
    })

    test('treat a negative number as a value', () => {
      const opts = [new Option('--offset <n:number>')]
      const result = parseArgv(['--offset', '-5'], [], opts)
      expect(result.options.offset).toBe(-5)
    })
  })

  describe('bundled short flags', () => {
    test('expand into separate flags, the last taking a value', () => {
      const opts = [
        new Option('-n, --dry-run'),
        new Option('-v, --verbose'),
        new Option('-f, --from [account]'),
      ]
      const result = parseArgv(['-nvf', 'exodus_1'], [], opts)
      expect(result.options).toMatchObject({
        dryRun: true,
        verbose: true,
        from: 'exodus_1',
      })
    })
  })

  describe('strict', () => {
    test('rejects an unknown option with a suggestion', () => {
      const opts = [new Option('-n, --dry-run')]
      expect(() => parseArgv(['--dry-rn'], [], opts, { strict: true })).toThrow(
        'Unknown option: --dry-rn (did you mean --dry-run?)',
      )
    })

    test('rejects an extra positional', () => {
      const args = [new Argument('<to>')]
      expect(() =>
        parseArgv(['x', 'extra'], args, [], { strict: true }),
      ).toThrow('Unexpected argument: extra')
    })

    test('rejects a value on a boolean flag', () => {
      const opts = [new Option('-v, --verbose')]
      expect(() =>
        parseArgv(['--verbose=no'], [], opts, { strict: true }),
      ).toThrow('Option --verbose does not take a value')
    })

    test('keeps everything after -- as positionals', () => {
      const args = [new Argument('[...rest]')]
      const result = parseArgv(['--', '--unknown'], args, [], { strict: true })
      expect(result.positionals).toEqual([['--unknown']])
    })

    test('lenient mode still ignores unknown options', () => {
      const result = parseArgv(['--anything', 'x'], [], [])
      expect(result.positionals).toEqual([])
    })
  })

  describe('wantsHelp', () => {
    test('finds -h and --help before --', () => {
      expect(wantsHelp(['x', '--help'])).toBe(true)
      expect(wantsHelp(['-h'])).toBe(true)
      expect(wantsHelp(['--', '-h'])).toBe(false)
    })
  })
})
