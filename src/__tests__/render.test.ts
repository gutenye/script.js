import { expect, test } from 'bun:test'
import type { RenderOutput } from '../render'
import { renderOutput } from '../render'

test('renders single blocks and omits empty blocks without trimming text', () => {
  expect(renderOutput('plain')).toBe('plain')
  expect(renderOutput({ lines: ['first', 'second'] })).toBe('first\nsecond')
  expect(renderOutput(['', { table: [] }, { record: {} }, { lines: [] }])).toBe(
    '',
  )
  expect(renderOutput(['  before  ', '', { table: [] }, 'after'])).toBe(
    '  before  \n\nafter',
  )
})

test.each([
  null,
  123,
  { unknown: [] },
  { table: [], lines: [] },
  { format: 'table', data: [] },
  { format: () => 123, data: [] },
])('rejects an invalid output block: %p', (block) => {
  expect(() => renderOutput(block as unknown as RenderOutput)).toThrow(
    expect.objectContaining({ code: 'invalid_render_block' }),
  )
})
