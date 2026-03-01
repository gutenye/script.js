#!/usr/bin/env bun --env-file ''

import path from 'node:path'
import { app } from './Command'
import { $ } from './spawn'

globalThis.$ = $
globalThis.app = app

const scriptPath = Bun.argv[2]
if (!scriptPath) {
  console.error('Usage: script.js <script>')
  process.exit(1)
}

await import(path.resolve(scriptPath))
await app.runViaScriptJs()
