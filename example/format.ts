#!/usr/bin/env bun

import { app } from '../src/index'

app.name('format-preview', 'Preview human and JSON output')

app
  .cmd('table', 'Show a table')
  .add(() => [
    { Name: 'dev', Path: '~/dev' },
    { Name: 'Cloud', Path: '~/Cloud' },
  ])
  .render(app.format.table)

app
  .cmd('record', 'Show a record')
  .add(() => ({ Name: 'dev', Path: '~/dev', Files: 42, Paused: false }))
  .render(app.format.record)

app
  .cmd('lines', 'Show plain lines')
  .add(() => ['~/dev', '~/Cloud'])
  .render(app.format.lines)

await app.run()
