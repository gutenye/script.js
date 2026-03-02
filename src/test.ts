#!/usr/bin/env bun

import { app } from './Command'
import { $ } from './spawn'

app
  .cmd('cmd1 | c1', 'Command 1')
  .add('<platform>', 'Platform', [
    'ios',
    'android',
    'windows',
    'macos',
    'linux',
    'unknown',
  ])
  .add('<name>', 'Name')
  .add('-l | --long')
  .add(async (platform: string, options: any, ctx: any) => {
    console.log(platform, options, ctx)
    const name = 'Mike Smith'
    const args = ['arg 1', 'arg 2']
    $`echo ${name} ${args}`
  })

await app.run()
