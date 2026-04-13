import { describe, expect, test } from 'bun:test'
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
})
