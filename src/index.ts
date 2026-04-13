import { app } from './Command'

let hasRun = false
process.on('beforeExit', async () => {
  if (hasRun) return
  hasRun = true
  await app.run()
})

export { app, Command } from './Command'
export * from './helpers'
export type { Options } from './parseArgv'
export { $ } from './spawn'
