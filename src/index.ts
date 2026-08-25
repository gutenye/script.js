import { runAppBeforeExit } from './Command'

process.on('beforeExit', runAppBeforeExit)

export { app, Command } from './Command'
export * from './helpers'
export type { Options } from './parseArgv'
export { $ } from './spawn'
