import type { TableData, TableOptions } from './format'
import { format } from './format'

export function printTable(
  data: TableData,
  options?: Pick<TableOptions, 'headers'>,
): void {
  const output = format.table(data, { ...options, color: true })
  if (output) console.log(`${output}\n`)
}
