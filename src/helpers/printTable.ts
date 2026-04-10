import type { SpanningCellConfig } from 'table'
import { getBorderCharacters, table as rawTable } from 'table'

// data: [{a: '1'}] | [['a'], ['1'], ..] | { Group: {key: value} }
export function printTable(
  data:
    | Record<string, unknown>[]
    | unknown[][]
    | Record<string, Record<string, unknown>>,
): void {
  if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
    printGroupedTable(data as Record<string, Record<string, unknown>>)
    return
  }

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
      drawHorizontalLine: (lineIndex, rowCount) =>
        [0, 1, rowCount].includes(lineIndex),
      border: borderChars,
    },
  )
  console.log(output)
}

function printGroupedTable(
  data: Record<string, Record<string, unknown>>,
): void {
  const entries = Object.entries(data).filter(
    ([, group]) => Object.keys(group).length > 0,
  )
  if (entries.length === 0) return

  const tableData: string[][] = []
  const spanningCells: SpanningCellConfig[] = []
  const groupHeaderRows = new Set<number>()

  for (const [groupName, group] of entries) {
    const headerRow = tableData.length
    groupHeaderRows.add(headerRow)
    tableData.push([`\x1b[1;32m${groupName}\x1b[0m`, ''])
    spanningCells.push({ col: 0, row: headerRow, colSpan: 2 })

    for (const [key, value] of Object.entries(group)) {
      tableData.push([key, String(value ?? '')])
    }
  }

  const output = rawTable(tableData, {
    spanningCells,
    drawHorizontalLine: (lineIndex, rowCount) => {
      if (lineIndex === 0 || lineIndex === rowCount) return true
      // Draw line before and after each group header
      if (groupHeaderRows.has(lineIndex)) return true
      if (groupHeaderRows.has(lineIndex - 1)) return true
      return false
    },
    border: borderChars,
  })
  console.log(output)
}

const borderChars = {
  ...getBorderCharacters('norc'),
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
}
