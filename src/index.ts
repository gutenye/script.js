import { runAppBeforeExit } from './Command'
import { runNext } from './pagination'

process.on('beforeExit', runAppBeforeExit)

export type { Mixin } from './Command'
export { app, Command } from './Command'
export type { Context } from './CommandTypes'
export type { CommandDescription } from './describe'
export * from './helpers'
export type { Options } from './parseArgv'
export type { RenderOutput } from './render'
export { $ } from './spawn'
export { CommandError } from './structured'

export async function next(argv: string[] = []) {
  process.off('beforeExit', runAppBeforeExit)
  await runNext(argv)
}
