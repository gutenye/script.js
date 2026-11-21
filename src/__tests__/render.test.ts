import { expect, test } from 'bun:test'
import { renderOutput } from '../render'

test.each([
  ['plain', 'plain'],
  ['\n  before\n\n  after  \n\n', 'before\n\n  after'],
  ['', ''],
  [' \n\t ', ''],
])('trims surrounding whitespace from %p', (output, expected) => {
  expect(renderOutput(output)).toBe(expected)
})

test.each([
  [null],
  [123],
  [['text']],
  [{ table: [] }],
])('rejects a non-string renderer result: %p', (output) => {
  expect(() => renderOutput(output as unknown as string)).toThrow(
    expect.objectContaining({ code: 'invalid_render_output' }),
  )
})
