import type { SpanningCellConfig } from 'table'
import { getBorderCharacters, table as rawTable } from 'table'
import { captureTablePage, isPaginatingTables } from '../tablePages'

export const format = {
  table: formatTable,
  record: formatRecord,
  lines: formatLines,
  section: formatSection,
  field: formatField,
}

// data: [{a: '1'}] | [['a'], ['1'], ..] | { Group: [{a: '1'}] | [['a'], ['1']] }
function formatTable(data: TableData, options: TableOptions = {}): string {
  const limit = options.limit ?? (isPaginatingTables() ? 50 : Infinity)
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 0)) {
    throw new RangeError(
      'Table limit must be a non-negative integer or Infinity',
    )
  }
  if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
    return formatGroupedTable(data as Record<string, GroupValue>, options)
  }

  if (!Array.isArray(data) || data.length === 0) return ''

  let columns: string[]
  let rows: string[][]
  let totalRows: number

  if (Array.isArray(data[0])) {
    columns = (data[0] as unknown[]).map(formatValue)
    totalRows = data.length - 1
    rows = (data as unknown[][])
      .slice(1, limit + 1)
      .map((row) => row.map(formatValue))
  } else {
    columns = [
      ...new Set((data as Record<string, unknown>[]).flatMap(Object.keys)),
    ]
    totalRows = data.length
    rows = (data as Record<string, unknown>[])
      .slice(0, limit)
      .map((row) => columns.map((col) => formatValue(row[col])))
  }

  if (columns.length === 0) return ''
  if (limit === 0) return withOmittedRows('', totalRows)

  const output = rawTable(
    [columns.map((v) => formatHeading(v, options.color)), ...rows],
    {
      drawHorizontalLine: (lineIndex, rowCount) =>
        [0, 1, rowCount].includes(lineIndex),
      border: borderChars,
    },
  )
  const preview = withOmittedRows(output.trimEnd(), totalRows - rows.length)
  if (isPaginatingTables() && limit > 0 && totalRows > limit) {
    const allRows = Array.isArray(data[0])
      ? (data as unknown[][]).slice(1).map((row) => row.map(formatValue))
      : (data as Record<string, unknown>[]).map((row) =>
          columns.map((column) => formatValue(row[column])),
        )
    captureTablePage(
      {
        data: [columns, ...allRows],
        pageSize: limit,
        offset: limit,
        color: options.color,
      },
      preview,
    )
  }
  return preview
}

function formatGroupedTable(
  data: Record<string, GroupValue>,
  options: TableOptions,
): string {
  const { headers } = options
  const limit = options.limit ?? (isPaginatingTables() ? 50 : Infinity)
  const groups = Object.entries(data)
    .map(([name, value]) => [name, groupToRows(value)] as const)
    .filter(([, rows]) => rows.length > 0)
  if (groups.length === 0) return ''

  const colCount = Math.max(
    headers?.length ?? 0,
    ...groups.flatMap(([, rows]) => rows.map((r) => r.length)),
  )
  if (colCount === 0) return ''
  const totalRows = groups.reduce((count, [, rows]) => count + rows.length, 0)
  if (limit === 0) return withOmittedRows('', totalRows)
  const tableData: string[][] = []
  const spanningCells: SpanningCellConfig[] = []
  const groupHeaderRows = new Set<number>()
  let hasColumnHeaders = false

  if (headers) {
    hasColumnHeaders = true
    const padded = [
      ...headers,
      ...Array(Math.max(0, colCount - headers.length)).fill(''),
    ]
    tableData.push(padded.map((v) => formatHeading(v, options.color)))
  }

  let remaining = limit
  for (const [groupName, rows] of groups) {
    if (remaining === 0) break
    const visibleRows = rows.slice(0, remaining)
    remaining -= visibleRows.length
    const headerRow = tableData.length
    groupHeaderRows.add(headerRow)
    tableData.push([
      formatHeading(groupName, options.color),
      ...Array(colCount - 1).fill(''),
    ])
    spanningCells.push({ col: 0, row: headerRow, colSpan: colCount })

    for (const row of visibleRows) {
      tableData.push([
        ...row,
        ...Array(Math.max(0, colCount - row.length)).fill(''),
      ])
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
  const preview = withOmittedRows(
    output.trimEnd(),
    Math.max(0, totalRows - limit),
  )
  if (isPaginatingTables() && limit > 0 && totalRows > limit) {
    captureTablePage(
      {
        data: Object.fromEntries(groups),
        pageSize: limit,
        offset: limit,
        headers,
        color: options.color,
      },
      preview,
    )
  }
  return preview
}

function withOmittedRows(output: string, omitted: number): string {
  if (omitted === 0) return output
  const message = `… ${omitted} more ${omitted === 1 ? 'row' : 'rows'}`
  return output ? `${output}\n${message}` : message
}

function formatRecord(
  data: Record<string, unknown>,
  options: Pick<TableOptions, 'color'> = {},
): string {
  const rows = Object.entries(data).map(([key, value]) => [
    formatHeading(key, options.color),
    formatValue(value),
  ])
  if (rows.length === 0) return ''
  return rawTable(rows, {
    border: borderChars,
    drawHorizontalLine: (index, rowCount) => index === 0 || index === rowCount,
  }).trimEnd()
}

function formatLines(values: Iterable<unknown>): string {
  return Array.from(values, formatValue).join('\n')
}

function formatSection(title: string, content: string): string {
  const text = content.trim()
  return text ? `${title}\n${text}` : ''
}

function formatField(label: string, value: unknown): string {
  const text = formatValue(value).trim()
  return text ? `${label}: ${text}` : ''
}

function formatHeading(value: string, color = Bun.enableANSIColors): string {
  return color ? `\x1b[1;32m${value}\x1b[0m` : value
}

function formatValue(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'object'
    ? (JSON.stringify(value) ?? '')
    : String(value)
}

function groupToRows(data: GroupValue): string[][] {
  if (data.length === 0) return []
  if (Array.isArray(data[0])) {
    return (data as unknown[][]).map((row) => row.map(formatValue))
  }
  const records = data as Record<string, unknown>[]
  const columns = [...new Set(records.flatMap(Object.keys))]
  return records.map((row) => columns.map((col) => formatValue(row[col])))
}

export type TableData =
  | Record<string, unknown>[]
  | unknown[][]
  | Record<string, GroupValue>

export type TableOptions = {
  headers?: string[]
  color?: boolean
  limit?: number
}

type GroupValue = Record<string, unknown>[] | unknown[][]

const borderChars = {
  ...getBorderCharacters('norc'),
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
}
