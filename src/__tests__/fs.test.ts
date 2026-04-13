import { describe, expect, test } from 'bun:test'
import os from 'node:os'
import path from 'node:path'
import { realpathSyncSafe } from '../utils/fs'

describe('realpathSyncSafe()', () => {
  test('resolves an existing path', () => {
    const home = os.homedir()
    expect(realpathSyncSafe(home)).toBe(home)
  })

  test('returns raw path when it does not exist', () => {
    const missing = path.join(os.tmpdir(), 'does-not-exist-' + Date.now())
    expect(realpathSyncSafe(missing)).toBe(missing)
  })
})
