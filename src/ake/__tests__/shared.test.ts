import { describe, expect, test } from 'bun:test'
import { getAkeFilenames, getAkeSuffix } from '../shared'

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
