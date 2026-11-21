import { CommandError } from './structured'

export function renderOutput(output: string): string {
  if (typeof output !== 'string') {
    throw new CommandError('A renderer must return a string', {
      code: 'invalid_render_output',
    })
  }
  return output.trim()
}
