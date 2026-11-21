import { describe, expect, test } from 'bun:test'
import { format } from '../helpers/format'

describe('format', () => {
  test.each([
    ['timeout', 'Incomplete: timeout'],
    [' timeout \n', 'Incomplete: timeout'],
    [0, 'Incomplete: 0'],
    [false, 'Incomplete: false'],
    ['', ''],
    [' \n\t ', ''],
    [null, ''],
    [undefined, ''],
    [{ ok: true }, 'Incomplete: {"ok":true}'],
  ])('formats an optional field for %p', (value, expected) => {
    const { field } = format
    expect(field('Incomplete', value)).toBe(expected)
  })

  test('sections keep the heading and content together without a trailing newline', () => {
    const { section } = format
    expect(section('Status', '  first\nsecond\n')).toBe('Status\nfirst\nsecond')
  })

  test('sections omit the heading when the content is empty', () => {
    expect(format.section('Hidden', '')).toBe('')
    expect(format.section('Hidden', ' \n\t ')).toBe('')
    expect(format.section('Hidden', format.table([]))).toBe('')
  })

  test('returns a table string without a trailing newline', () => {
    const output = format.table([{ Name: 'demo', Path: '/example' }], {
      color: false,
    })
    expect(output).toContain('│ Name')
    expect(output).toContain('/example')
    expect(output.startsWith('╭')).toBe(true)
    expect(output.endsWith('╯')).toBe(true)
  })

  test('tables include fields introduced after the first record', () => {
    const output = format.table([{ Name: 'demo' }, { Count: 0 }], {
      color: false,
    })
    expect(output).toContain('Count')
    expect(output).toContain('0')
  })

  test('records preserve falsy values and display structured values', () => {
    const output = format.record(
      { Count: 0, Paused: false, Missing: null, Details: { ok: true } },
      { color: false },
    )
    expect(output).toContain('0')
    expect(output).toContain('false')
    expect(output).toContain('{"ok":true}')
    expect(output).not.toContain('null')
    expect(output).not.toContain('undefined')
  })

  test('plain lines preserve order, spaces, and blank values from iterables', () => {
    expect(format.lines(new Set(['first path', 'second path']))).toBe(
      'first path\nsecond path',
    )
    expect(format.lines([0, false, null, 'last'])).toBe('0\nfalse\n\nlast')
  })

  test('empty inputs return an empty string', () => {
    expect(format.table([])).toBe('')
    expect(format.table([{}])).toBe('')
    expect(format.table({ Empty: [[]] })).toBe('')
    expect(format.table({ Empty: [] })).toBe('')
    expect(format.record({})).toBe('')
    expect(format.lines([])).toBe('')
  })

  test('color can be requested or disabled for captured output', () => {
    for (const render of [
      () => format.table([{ Name: 'demo' }], { color: true }),
      () => format.record({ Name: 'demo' }, { color: true }),
    ]) {
      expect(render()).toContain('\x1b[1;32mName\x1b[0m')
    }
    expect(format.table([{ Name: 'demo' }], { color: false })).not.toContain(
      '\x1b',
    )
  })
})
