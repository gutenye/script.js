let activeTables: CapturedTable[] | undefined

export function collectTablePages(render: () => string) {
  const previous = activeTables
  const tables: CapturedTable[] = []
  activeTables = tables
  try {
    const output = render()
    return {
      output,
      tables: tables
        .filter(({ preview }) => output.includes(preview))
        .map(({ table }) => table),
    }
  } finally {
    activeTables = previous
  }
}

export function isPaginatingTables() {
  return activeTables !== undefined
}

export function captureTablePage(table: TableSnapshot, preview: string) {
  activeTables?.push({ table, preview })
}

export type TableSnapshot = {
  data: string[][] | Record<string, string[][]>
  pageSize: number
  offset: number
  headers?: string[]
  color?: boolean
}

type CapturedTable = { table: TableSnapshot; preview: string }
