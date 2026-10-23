import { describe, expect, test } from 'bun:test'
import { printJson } from '../helpers'

describe('printJson()', () => {
  test('prints indented JSON on stdout', () => {
    const logs: string[] = []
    const origLog = console.log
    console.log = (...args: any[]) => logs.push(args.join(' '))
    printJson({ route: 'PayHome', pending: [] })
    console.log = origLog
    expect(logs).toEqual(['{\n  "route": "PayHome",\n  "pending": []\n}'])
  })
})
