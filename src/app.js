import { Argument, Option, installCompletion, program } from './completion.js'

const [nodePath, zxPath, scriptJsPath, scriptPath, ...args] = process.argv

export const app = program

app.Argument = Argument
app.Option = Option

export async function start() {
  if (!scriptPath) {
    echo('Error: missing script path, usage: shellin.js <script>')
    process.exit(1)
  }

  await import(scriptPath)

  const promise = installCompletion()
  if (args.length === 0) {
    // wait for file write operation completed before app print hellp and exit in parse()
    await promise
  }

  program.parse([nodePath, scriptPath, ...args])
}
