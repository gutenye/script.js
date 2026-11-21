import type { TableData, TableOptions } from './helpers/format'
import { format } from './helpers/format'
import { CommandError } from './structured'

export function renderOutput(output: RenderOutput): string {
  const blocks = Array.isArray(output) ? output : [output]
  return blocks
    .map(renderBlock)
    .filter((text) => text !== '')
    .join('\n\n')
}

function renderBlock(block: RenderBlock): string {
  if (typeof block === 'string') return block
  const keys = ['table', 'record', 'lines', 'format']
  if (
    !block ||
    typeof block !== 'object' ||
    keys.filter((key) => Object.hasOwn(block, key)).length !== 1
  ) {
    throw new CommandError('Output blocks must specify exactly one formatter', {
      code: 'invalid_render_block',
    })
  }

  let text: string
  if ('table' in block) text = format.table(block.table, block.options)
  else if ('record' in block) text = format.record(block.record, block.options)
  else if ('lines' in block) text = format.lines(block.lines)
  else {
    if (typeof block.format !== 'function') {
      throw new CommandError('An output block formatter must be a function', {
        code: 'invalid_render_block',
      })
    }
    text = block.format(block.data, block.options)
  }
  if (typeof text !== 'string') {
    throw new CommandError('An output block formatter must return a string', {
      code: 'invalid_render_block',
    })
  }
  return text
}

export type RenderOutput = RenderBlock | RenderBlock[]

export type RenderBlock =
  | string
  | { table: TableData; options?: TableOptions }
  | { record: Record<string, unknown>; options?: Pick<TableOptions, 'color'> }
  | { lines: Iterable<unknown> }
  | { format: (data: any, options?: any) => string; data: any; options?: any }
