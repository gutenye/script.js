import { describe, expect, test } from 'bun:test'
import { Argument } from '../Argument'

describe('Argument', () => {
  test('parses required argument <name>', () => {
    const arg = new Argument('<platform>', 'Platform')
    expect(arg.name).toBe('platform')
    expect(arg.required).toBe(true)
    expect(arg.variadic).toBe(false)
  })

  test('parses optional argument [name]', () => {
    const arg = new Argument('[port]', 'Port')
    expect(arg.name).toBe('port')
    expect(arg.required).toBe(false)
    expect(arg.variadic).toBe(false)
  })

  test('parses required variadic <...name>', () => {
    const arg = new Argument('<...files>', 'Files')
    expect(arg.name).toBe('files')
    expect(arg.required).toBe(true)
    expect(arg.variadic).toBe(true)
  })

  test('parses optional variadic [...name]', () => {
    const arg = new Argument('[...files]', 'Files')
    expect(arg.name).toBe('files')
    expect(arg.required).toBe(false)
    expect(arg.variadic).toBe(true)
  })

  test('stores description and completion', () => {
    const arg = new Argument('<platform>', 'Platform', ['ios', 'android'])
    expect(arg.description).toBe('Platform')
    expect(arg.completion).toEqual(['ios', 'android'])
  })

  test('accepts function completion', () => {
    const fn = () => ['ios', 'android']
    const arg = new Argument('<platform>', 'Platform', fn)
    expect(arg.completion).toBe(fn)
  })

  test('parses a value type and converts its default', () => {
    const arg = new Argument('[depth:number=6]')
    expect(arg.name).toBe('depth')
    expect(arg.valueType).toBe('number')
    expect(arg.defaultValue).toBe(6)
  })

  test('keeps a colon inside a default value', () => {
    const arg = new Argument('[url=http://localhost]')
    expect(arg.name).toBe('url')
    expect(arg.defaultValue).toBe('http://localhost')
  })
})
