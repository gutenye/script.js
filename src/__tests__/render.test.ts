import { expect, test } from 'bun:test'
import type { RenderOutput } from '../render'
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
  [[['nested']]],
  [['before', false]],
  [{ table: [] }],
])('rejects a renderer result other than a string or flat string array: %p', (output) => {
  expect(() => renderOutput(output as unknown as RenderOutput)).toThrow(
    expect.objectContaining({ code: 'invalid_render_output' }),
  )
})

test.each([
  [[` \nBefore  `, ' \t ', '\nAfter\n'], 'Before\n\nAfter'],
  [[], ''],
  [['', ' \n '], ''],
])('joins nonempty strings with one blank line: %p', (output, expected) => {
  expect(renderOutput(output)).toBe(expected)
})
