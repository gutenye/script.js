import { runAppBeforeExit } from './Command'

process.on('beforeExit', runAppBeforeExit)

export type { Mixin } from './Command'
export { app, Command } from './Command'
export type { Context } from './CommandTypes'
export * from './helpers'
export type { Options } from './parseArgv'
export { $ } from './spawn'
