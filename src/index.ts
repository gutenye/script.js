import { app } from './Command'
import { exitOnShellError } from './spawn'

let hasRun = false
process.on('beforeExit', async () => {
  if (hasRun) return
  hasRun = true
  try {
    await app.run()
  } catch (error) {
    exitOnShellError(error)
  }
})

export { app, Command } from './Command'
export * from './helpers'
export type { Options } from './parseArgv'
export { $ } from './spawn'
