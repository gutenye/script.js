import { Argument, Option, program } from './command'

const [bunPath, scriptJsPath, scriptPath, ...args] = process.argv

export const app = program

app.Argument = Argument
app.Option = Option

export async function start() {
  if (!scriptPath) {
    echo('Error: missing script path, usage: gutenye-script.js <script>')
    process.exit(1)
  }

  await import(scriptPath)

  const promise = program.installCompletion()
  if (args.length === 0) {
    // wait for file write operation completed before app print hellp and exit in parse()
    await promise
  }

  program.parse(args, { from: 'user' })
}
