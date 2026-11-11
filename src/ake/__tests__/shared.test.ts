import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  getAkeFilenames,
  getAkeSuffix,
  getCompletionName,
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

describe('getCompletionName()', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ake-name-')),
    )
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('joins ake and the path with "+", turning "/" into "_"', () => {
    const dir = path.join(tmpDir, 'exact-todo')
    fs.mkdirSync(dir)
    expect(getCompletionName('', dir)).toBe(`ake+${dir.replaceAll('/', '_')}`)
  })

  test('keeps the suffix before the "+"', () => {
    expect(getCompletionName('a', tmpDir)).toBe(
      `akea+${tmpDir.replaceAll('/', '_')}`,
    )
  })

  // carapace ignores a spec whose name has '.', '|' or '@'
  test('turns "." in the path into "+"', () => {
    const dir = path.join(tmpDir, 'bin.src', 'script.js')
    fs.mkdirSync(dir, { recursive: true })
    const name = getCompletionName('', dir)
    expect(name).toEndWith('_bin+src_script+js')
    expect(name).toMatch(/^[\w+-]+$/)
  })

  test('resolves symlinks so every link to a project shares one spec', () => {
    const link = path.join(tmpDir, 'link')
    fs.symlinkSync(tmpDir, link)
    expect(getCompletionName('', link)).toBe(getCompletionName('', tmpDir))
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

    test('prefers worktree dir when CWD symlinks a remote ake', () => {
      const remoteDir = path.join(REMOTE_DIR, '_data_project')
      const remoteAke = path.join(remoteDir, 'ake')
      fs.mkdirSync(remoteDir, { recursive: true })
      fs.writeFileSync(remoteAke, '#!/usr/bin/env bun\n')
      try {
        fs.rmSync(path.join(tmpDir, 'ake'))
        fs.symlinkSync(remoteAke, path.join(tmpDir, 'ake'))
        process.chdir(tmpDir)
        expect(getProjectDir(remoteAke)).toBe(tmpDir)
      } finally {
        fs.rmSync(remoteDir, { recursive: true, force: true })
      }
    })
  })
})
