#!/usr/bin/env bun

import { $, app, cmd } from './Command'

cmd('cmd1 | c1', 'Command 1')
  .a('<platform>', 'Platform', [
    'ios',
    'android',
    'windows',
    'macos',
    'linux',
    'unknown',
  ])
  .a('<name>', 'Name')
  .a((ctx) => {
    console.log('cmd')
    $`echo ${ctx.args}`
  })

await app.run()
