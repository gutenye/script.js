import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  getAkeFilenames,
  getAkeSuffix,
  getProjectDir,
  isAke,
  REMOTE_DIR,
} from '../shared'

describe('getAkeFilenames()', () => {
  test('returns default ake filenames with no suffix', () => {
    expect(getAkeFilenames()).toEqual(['ake', 'ake.ts'])
  })

  test('returns suffixed filenames', () => {
    expect(getAkeFilenames('foo')).toEqual(['akefoo', 'akefoo.ts'])
  })

  test('returns single-char suffixed filenames', () => {
    expect(getAkeFilenames('a')).toEqual(['akea', 'akea.ts'])
  })
})

describe('getAkeSuffix()', () => {
  test('returns empty string for "ake"', () => {
    expect(getAkeSuffix('ake')).toBe('')
  })

  test('returns empty string for "ake.ts"', () => {
    expect(getAkeSuffix('ake.ts')).toBe('')
  })

  test('returns suffix for "akefoo"', () => {
    expect(getAkeSuffix('akefoo')).toBe('foo')
  })

  test('returns suffix for "akefoo.ts"', () => {
    expect(getAkeSuffix('akefoo.ts')).toBe('foo')
  })

  test('returns suffix for single char "akea"', () => {
    expect(getAkeSuffix('akea')).toBe('a')
  })

  test('returns null for "akectl"', () => {
    expect(getAkeSuffix('akectl')).toBeNull()
  })

  test('returns null for non-ake names', () => {
    expect(getAkeSuffix('other')).toBeNull()
  })
})

describe('isAke()', () => {
  test('true for ake files', () => {
    expect(isAke('/project/ake')).toBe(true)
    expect(isAke('/project/akefoo')).toBe(true)
    expect(isAke('/project/ake.ts')).toBe(true)
  })

  test('false for non-ake files', () => {
    expect(isAke('/project/akectl')).toBe(false)
    expect(isAke('/project/script.ts')).toBe(false)
  })
})

describe('getProjectDir()', () => {
  test('returns dirname for local ake file', () => {
    expect(getProjectDir('/data/project/ake')).toBe('/data/project')
  })

  test('reverses unique name for remote ake file', () => {
    expect(getProjectDir(`${REMOTE_DIR}/_data_project/ake`)).toBe(
      '/data/project',
    )
  })

  // Bun resolves symlinks in Bun.main, so `./ake -> ../ake` would surface
  // as the parent's ake. Verify we walk back up from CWD to the symlink.
  describe('symlinked ake', () => {
    let tmpDir: string
    let originalCwd: string

    beforeEach(() => {
      originalCwd = process.cwd()
      tmpDir = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), 'ake-test-')),
      )
      fs.mkdirSync(path.join(tmpDir, 'sub'))
      fs.writeFileSync(path.join(tmpDir, 'ake'), '#!/usr/bin/env bun\n')
      fs.symlinkSync('../ake', path.join(tmpDir, 'sub', 'ake'))
    })

    afterEach(() => {
      process.chdir(originalCwd)
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    test('returns symlink dir when CWD has a symlink to ake', () => {
      process.chdir(path.join(tmpDir, 'sub'))
      expect(getProjectDir(path.join(tmpDir, 'ake'))).toBe(
        path.join(tmpDir, 'sub'),
      )
    })

    test('returns real dir when CWD has no symlink', () => {
      process.chdir(tmpDir)
      expect(getProjectDir(path.join(tmpDir, 'ake'))).toBe(tmpDir)
    })
  })
})
