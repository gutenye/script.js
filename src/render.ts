import { CommandError } from './structured'

export function renderOutput(output: RenderOutput): string {
  const parts = Array.isArray(output) ? output : [output]
  for (const part of parts) {
    if (typeof part !== 'string') {
      throw new CommandError(
        'A renderer must return a string or a flat array of strings',
        {
          code: 'invalid_render_output',
        },
      )
    }
  }
  return parts
    .map((text) => text.trim())
    .filter(Boolean)
    .join('\n\n')
}

export type RenderOutput = string | string[]
