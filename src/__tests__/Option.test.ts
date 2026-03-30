import { describe, expect, test } from 'bun:test'
import { Option } from '../Option'

describe('Option', () => {
  test('parses boolean flag -l, --long', () => {
    const opt = new Option('-l, --long')
    expect(opt.short).toBe('-l')
    expect(opt.long).toBe('--long')
    expect(opt.required).toBe(false)
    expect(opt.optional).toBe(false)
    expect(opt.variadic).toBe(false)
    expect(opt.negate).toBe(false)
    expect(opt.attributeName).toBe('long')
  })

  test('parses long-only boolean --verbose', () => {
    const opt = new Option('--verbose')
    expect(opt.short).toBeUndefined()
    expect(opt.long).toBe('--verbose')
    expect(opt.attributeName).toBe('verbose')
  })

  test('parses short-only flag -v', () => {
    const opt = new Option('-v')
    expect(opt.short).toBe('-v')
    expect(opt.long).toBeUndefined()
    expect(opt.attributeName).toBe('v')
  })

  test('parses required value -p, --port <number>', () => {
    const opt = new Option('-p, --port <number>')
    expect(opt.short).toBe('-p')
    expect(opt.long).toBe('--port')
    expect(opt.required).toBe(true)
    expect(opt.optional).toBe(false)
    expect(opt.attributeName).toBe('port')
  })

  test('parses optional value -o, --output [file]', () => {
    const opt = new Option('-o, --output [file]')
    expect(opt.short).toBe('-o')
    expect(opt.long).toBe('--output')
    expect(opt.required).toBe(false)
    expect(opt.optional).toBe(true)
    expect(opt.attributeName).toBe('output')
  })

  test('parses negate flag --no-color', () => {
    const opt = new Option('--no-color')
    expect(opt.long).toBe('--no-color')
    expect(opt.negate).toBe(true)
    expect(opt.attributeName).toBe('color')
  })

  test('parses variadic option -b, --values [values...]', () => {
    const opt = new Option('-b, --values [values...]')
    expect(opt.optional).toBe(true)
    expect(opt.variadic).toBe(true)
    expect(opt.attributeName).toBe('values')
  })

  test('camelCases multi-word long flag --string-a', () => {
    const opt = new Option('-a, --string-a [string]')
    expect(opt.attributeName).toBe('stringA')
  })

  test('parses inline default from [value=default]', () => {
    const opt = new Option('--output [file=out.txt]')
    expect(opt.optional).toBe(true)
    expect(opt.defaultValue).toBe('out.txt')
  })

  test('inline default is overridden by explicit default', () => {
    const opt = new Option('--output [file=out.txt]', '', 'override.txt')
    expect(opt.defaultValue).toBe('override.txt')
  })

  test('stores description and default', () => {
    const opt = new Option('-o, --output [file]', 'Output file', 'out.txt')
    expect(opt.description).toBe('Output file')
    expect(opt.defaultValue).toBe('out.txt')
  })

  test('accepts function completion', () => {
    const fn = () => ['json', 'yaml']
    const opt = new Option('--format <type>', 'Output format', fn)
    expect(opt.completion).toBe(fn)
    expect(opt.defaultValue).toBeUndefined()
  })
})
