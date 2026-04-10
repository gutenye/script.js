import { describe, expect, mock, test } from 'bun:test'
import { printTable } from '../helpers/printTable'

const logMock = mock()

describe('printTable', () => {
  logMock.mockReset()
  console.log = logMock as any

  test('flat table from records and 2D array', () => {
    printTable([{ Name: 'a', Value: '1' }])
    expect(captured()).toEqual(
      [
        '╭──────┬───────╮',
        '│ Name │ Value │',
        '├──────┼───────┤',
        '│ a    │ 1     │',
        '╰──────┴───────╯',
        '',
      ].join('\n'),
    )

    logMock.mockReset()
    printTable([
      ['Col1', 'Col2'],
      ['x', 'y'],
    ])
    expect(captured()).toEqual(
      [
        '╭──────┬──────╮',
        '│ Col1 │ Col2 │',
        '├──────┼──────┤',
        '│ x    │ y    │',
        '╰──────┴──────╯',
        '',
      ].join('\n'),
    )
  })

  test('grouped table with spanning headers, skips empty groups', () => {
    logMock.mockReset()
    printTable({
      General: { Format: 'MPEG-4', Duration: '1h' },
      Video: { Codec: 'H.264' },
    })
    expect(captured()).toEqual(
      [
        '╭───────────────────╮',
        '│ General           │',
        '├──────────┬────────┤',
        '│ Format   │ MPEG-4 │',
        '│ Duration │ 1h     │',
        '├──────────┴────────┤',
        '│ Video             │',
        '├──────────┬────────┤',
        '│ Codec    │ H.264  │',
        '╰──────────┴────────╯',
        '',
      ].join('\n'),
    )

    logMock.mockReset()
    printTable({
      General: { Format: 'MPEG-4' },
      Empty: {},
      Video: { Codec: 'H.264' },
    })
    expect(captured()).toEqual(
      [
        '╭─────────────────╮',
        '│ General         │',
        '├────────┬────────┤',
        '│ Format │ MPEG-4 │',
        '├────────┴────────┤',
        '│ Video           │',
        '├────────┬────────┤',
        '│ Codec  │ H.264  │',
        '╰────────┴────────╯',
        '',
      ].join('\n'),
    )
  })

  test('empty input does not render', () => {
    logMock.mockReset()
    printTable([])
    expect(logMock).not.toHaveBeenCalled()

    printTable({ Empty: {} })
    expect(logMock).not.toHaveBeenCalled()
  })
})

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

function captured(): string {
  return stripAnsi(logMock.mock.calls[0][0] as string)
}
