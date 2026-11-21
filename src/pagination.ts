import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { format } from './helpers/format'
import {
  CommandError,
  printError,
  printResult,
  toErrorShape,
} from './structured'
import type { TableSnapshot } from './tablePages'

const { SCRIPTJS_PAGINATION_CACHE } = process.env
const cacheFile =
  SCRIPTJS_PAGINATION_CACHE ?? path.join(homedir(), 'cache', 'script.js')

export function isNextRequest(argv: string[]) {
  const boundary = argv.indexOf('--')
  return argv
    .slice(0, boundary === -1 ? undefined : boundary)
    .some((arg) => arg === '--next' || arg.startsWith('--next='))
}

export async function handleNextRequest(argv: string[]) {
  if (!isNextRequest(argv)) return false
  if (argv.length !== 1 || argv[0] !== '--next') {
    throw new CommandError('--next must be used alone', {
      code: 'usage',
      exitCode: 2,
    })
  }
  const text = await withCacheLock(async () => {
    const saved = await readSavedTables()
    const pages: string[] = []
    for (const table of saved.tables) {
      const data = takePage(table)
      if (!data) continue
      pages.push(
        format.table(data, { headers: table.headers, color: table.color }),
      )
      table.offset += table.pageSize
    }
    if (pages.length) await writeSavedTables(saved.tables)
    return pages.join('\n\n')
  })
  if (text) await printResult(text, { json: false })
  return true
}

export async function runNext(argv: string[]) {
  if (argv.length === 1 && ['-h', '--help'].includes(argv[0])) {
    await printResult(
      'Usage: ,next\n\nPrint the next page of the most recently saved tables.',
      { json: false },
    )
    return
  }
  try {
    await handleNextRequest(['--next', ...argv])
  } catch (error) {
    const { exitCode, ...shape } = toErrorShape(error)
    printError(shape, { json: false })
    process.exitCode = exitCode
  }
}

export async function saveTablePages(tables: TableSnapshot[]) {
  await withCacheLock(() => writeSavedTables(tables))
}

async function writeSavedTables(tables: TableSnapshot[]) {
  const temporary = `${cacheFile}.${process.pid}.${crypto.randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify({ version: 1, tables }), {
      mode: 0o600,
      flag: 'wx',
    })
    await rename(temporary, cacheFile)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function readSavedTables(): Promise<{
  version: 1
  tables: TableSnapshot[]
}> {
  let text: string
  try {
    text = await readFile(cacheFile, 'utf8')
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      throw new CommandError('No saved table rows; run a command first', {
        code: 'no_saved_tables',
      })
    }
    throw error
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw invalidCache()
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.tables) ||
    !value.tables.every(isTableSnapshot)
  ) {
    throw invalidCache()
  }
  return { version: 1, tables: value.tables }
}

function takePage(table: TableSnapshot): TableSnapshot['data'] | undefined {
  const { offset, pageSize, data } = table
  if (Array.isArray(data)) {
    const rows = data.slice(1 + offset, 1 + offset + pageSize)
    return rows.length ? [data[0], ...rows] : undefined
  }
  let skip = offset
  let remaining = pageSize
  const groups: [string, string[][]][] = []
  for (const [name, rows] of Object.entries(data)) {
    const visible = rows.slice(skip, skip + remaining)
    skip = Math.max(0, skip - rows.length)
    if (visible.length) groups.push([name, visible])
    remaining -= visible.length
    if (remaining === 0) break
  }
  return groups.length ? Object.fromEntries(groups) : undefined
}

async function withCacheLock<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(path.dirname(cacheFile), { recursive: true, mode: 0o700 })
  const lockFile = `${cacheFile}.lock`
  const lock = await acquireCacheLock(lockFile)
  try {
    await lock.writeFile(String(process.pid))
    return await action()
  } finally {
    await lock.close()
    await rm(lockFile, { force: true })
  }
}

async function acquireCacheLock(lockFile: string) {
  try {
    return await open(lockFile, 'wx', 0o600)
  } catch (error) {
    if (!isErrorCode(error, 'EEXIST')) throw error
  }
  const owner = Number(await readFile(lockFile, 'utf8').catch(() => ''))
  let stale = false
  if (Number.isSafeInteger(owner) && owner > 0) {
    try {
      process.kill(owner, 0)
    } catch (error) {
      if (isErrorCode(error, 'ESRCH')) stale = true
    }
  }
  if (stale) {
    await rm(lockFile, { force: true })
    return open(lockFile, 'wx', 0o600).catch((error: unknown) => {
      if (isErrorCode(error, 'EEXIST')) throw busyCache()
      throw error
    })
  }
  throw busyCache()
}

function busyCache() {
  return new CommandError(
    'Table pagination cache is busy; retry after the other command exits',
    { code: 'pagination_busy' },
  )
}

function isTableSnapshot(value: unknown): value is TableSnapshot {
  if (!isRecord(value)) return false
  const validData = Array.isArray(value.data)
    ? value.data.length > 0 && isRows(value.data)
    : isRecord(value.data) && Object.values(value.data).every(isRows)
  return (
    validData &&
    typeof value.pageSize === 'number' &&
    Number.isSafeInteger(value.pageSize) &&
    value.pageSize > 0 &&
    typeof value.offset === 'number' &&
    Number.isSafeInteger(value.offset) &&
    value.offset >= 0 &&
    (value.color === undefined || typeof value.color === 'boolean') &&
    (value.headers === undefined || isStrings(value.headers))
  )
}

function isRows(value: unknown): value is string[][] {
  return Array.isArray(value) && value.every(isStrings)
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((cell) => typeof cell === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isErrorCode(error: unknown, code: string) {
  return error instanceof Error && 'code' in error && error.code === code
}

function invalidCache() {
  return new CommandError('Saved table data is invalid; run a command again', {
    code: 'invalid_pagination_cache',
  })
}
