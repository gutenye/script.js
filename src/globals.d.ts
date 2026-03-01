import type { Command } from './Command'
import type { $ as Shell } from './spawn'

declare global {
  var app: Command
  var $: typeof Shell
}
