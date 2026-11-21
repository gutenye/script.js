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

  test('limits record rows without mutating data or counting the header', () => {
    const rows = [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }]
    const output = format.table(rows, { limit: 2, color: false })
    expect(output).toContain('name')
    expect(output).toContain('alpha')
    expect(output).toContain('beta')
    expect(output).not.toContain('gamma')
    expect(output).toEndWith('… 1 more row')
    expect(rows).toEqual([
      { name: 'alpha' },
      { name: 'beta' },
      { name: 'gamma' },
    ])
    expect(format.table(rows, { limit: Infinity })).toBe(format.table(rows))
    expect(format.table(rows, { limit: 3 })).toBe(format.table(rows))
    expect(format.table(rows, { limit: 0 })).toBe('… 3 more rows')
  })

  test('limits array rows while keeping their header', () => {
    const output = format.table([['name'], ['alpha'], ['beta'], ['gamma']], {
      limit: 1,
    })
    expect(output).toContain('name')
    expect(output).toContain('alpha')
    expect(output).not.toContain('beta')
    expect(output).not.toContain('gamma')
    expect(output).toEndWith('… 2 more rows')
  })

  test('limits grouped data rows across groups without counting titles or headers', () => {
    const rows = { First: [['alpha'], ['beta']], Next: [['gamma'], ['delta']] }
    const output = format.table(rows, {
      headers: ['name'],
      limit: 3,
      color: false,
    })
    expect(output).toContain('First')
    expect(output).toContain('Next')
    expect(output).toContain('gamma')
    expect(output).not.toContain('delta')
    expect(output).toEndWith('… 1 more row')
    const first = format.table(rows, { limit: 1 })
    expect(first).not.toContain('Next')
    expect(first).toEndWith('… 3 more rows')
    expect(format.table(rows, { limit: 0 })).toBe('… 4 more rows')
    expect(format.table({}, { limit: 0 })).toBe('')
  })

  test.each([-1, 1.5, NaN])('rejects invalid table limit %p', (limit) => {
    expect(() => format.table([{ name: 'alpha' }], { limit })).toThrow(
      RangeError,
    )
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
