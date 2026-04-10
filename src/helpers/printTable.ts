import type { SpanningCellConfig } from 'table'
import { getBorderCharacters, table as rawTable } from 'table'

// data: [{a: '1'}] | [['a'], ['1'], ..] | { Group: [{a: '1'}] | [['a'], ['1']] }
export function printTable(
  data:
    | Record<string, unknown>[]
    | unknown[][]
    | Record<string, GroupValue>,
  options?: { headers?: string[] },
): void {
  if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
    printGroupedTable(data as Record<string, GroupValue>, options?.headers)
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
  data: Record<string, GroupValue>,
  headers?: string[],
): void {
  const groups = Object.entries(data)
    .map(([name, value]) => [name, groupToRows(value)] as const)
    .filter(([, rows]) => rows.length > 0)
  if (groups.length === 0) return

  const colCount = Math.max(
    headers?.length ?? 0,
    ...groups.flatMap(([, rows]) => rows.map((r) => r.length)),
  )
  const tableData: string[][] = []
  const spanningCells: SpanningCellConfig[] = []
  const groupHeaderRows = new Set<number>()
  let hasColumnHeaders = false

  if (headers) {
    hasColumnHeaders = true
    const padded = [...headers, ...Array(Math.max(0, colCount - headers.length)).fill('')]
    tableData.push(padded.map((v) => `\x1b[1;32m${v}\x1b[0m`))
  }

  for (const [groupName, rows] of groups) {
    const headerRow = tableData.length
    groupHeaderRows.add(headerRow)
    tableData.push([
      `\x1b[1;32m${groupName}\x1b[0m`,
      ...Array(colCount - 1).fill(''),
    ])
    spanningCells.push({ col: 0, row: headerRow, colSpan: colCount })

    for (const row of rows) {
      tableData.push([...row, ...Array(Math.max(0, colCount - row.length)).fill('')])
    }
  }

  const output = rawTable(tableData, {
    spanningCells,
    drawHorizontalLine: (lineIndex, rowCount) => {
      if (lineIndex === 0 || lineIndex === rowCount) return true
      if (hasColumnHeaders && lineIndex === 1) return true
      // Draw line before and after each group header
      if (groupHeaderRows.has(lineIndex)) return true
      if (groupHeaderRows.has(lineIndex - 1)) return true
      return false
    },
    border: borderChars,
  })
  console.log(output)
}

function groupToRows(data: GroupValue): string[][] {
  if (data.length === 0) return []
  if (Array.isArray(data[0])) {
    return (data as unknown[][]).map((row) => row.map(String))
  }
  const records = data as Record<string, unknown>[]
  const columns = Object.keys(records[0])
  return records.map((row) => columns.map((col) => String(row[col] ?? '')))
}

type GroupValue = Record<string, unknown>[] | unknown[][]

const borderChars = {
  ...getBorderCharacters('norc'),
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
}
