#!/usr/bin/env bun

import { app, cmd } from './Command'
import { $ } from './spawn'

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
  .a('-l | --long')
  .a((platform, options, ctx) => {
    console.log(platform, options, ctx)
    $`echo 1 ${ctx.args}`
  })

await app.run()
