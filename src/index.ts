import { app } from './Command'

process.on('beforeExit', async () => {
  await app.run()
})

export { app, Command } from './Command'
export * from './helpers'
export type { Options } from './parseArgv'
export { $ } from './spawn'
