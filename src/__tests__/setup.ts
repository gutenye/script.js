import { afterAll } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const directory = mkdtempSync(path.join(tmpdir(), 'scriptjs-test-cache-'))
process.env.SCRIPTJS_PAGINATION_CACHE = path.join(directory, 'pagination.json')

afterAll(() => {
  rmSync(directory, { recursive: true, force: true })
})
