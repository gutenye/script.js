import { getBorderCharacters, table as rawTable } from 'table'

// data: [{a: '1'}] | [['a'], ['1'], ..]
export function printTable(data: Record<string, unknown>[] | unknown[][]): void {
  if (!Array.isArray(data) || data.length === 0) return

  let columns: string[]
  let rows: string[][]

  if (Array.isArray(data[0])) {
    columns = (data[0] as unknown[]).map(String)
    rows = (data as unknown[][]).slice(1).map((row) => row.map(String))
  } else {
    columns = Object.keys(data[0] as Record<string, unknown>)
    rows = (data as Record<string, unknown>[]).map((row) =>
      columns.map((col) => String(row[col] ?? '')),
    )
  }

  const output = rawTable(
    [columns.map((v) => `\x1b[1;32m${v}\x1b[0m`), ...rows],
    {
      drawHorizontalLine: (lineIndex, rowCount) => [0, 1, rowCount].includes(lineIndex),
      border: {
        ...getBorderCharacters('norc'),
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
      },
    },
  )
  console.log(output)
}
