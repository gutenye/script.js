#!/usr/bin/env bun --env-file ''

import path from 'node:path'
import { $, app } from './index'
import { exitOnShellError } from './spawn'

;(globalThis as any).$ = $
;(globalThis as any).app = app

const scriptPath = Bun.argv[2]
if (!scriptPath) {
  console.error('Usage: script.js <script>')
  process.exit(1)
}

try {
  await import(path.resolve(scriptPath))
} catch (error) {
  exitOnShellError(error)
}
