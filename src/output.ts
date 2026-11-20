import { captureShellOutput, isShellResult } from './spawn'
import { CommandError } from './structured'

export function hasJsonFlag(argv: string[]) {
  const end = argv.indexOf('--')
  return (end === -1 ? argv : argv.slice(0, end)).some(
    (arg) => arg === '--json' || arg.startsWith('--json='),
  )
}

export async function captureJsonResult(
  action: () => unknown,
): Promise<unknown> {
  const output: string[] = []
  const originals = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    write: process.stdout.write,
    exit: process.exit,
  }
  const stderr = process.stderr.write.bind(process.stderr)
  let shellError: unknown
  const collect = (...args: unknown[]) => {
    const line = args
      .map((arg) =>
        typeof arg === 'string' ? arg : Bun.inspect(arg, { colors: false }),
      )
      .join(' ')
    output.push(`${line}\n`)
  }
  console.log = collect
  console.info = collect
  console.debug = collect
  process.stdout.write = ((
    chunk: string | Uint8Array,
    encoding?: unknown,
    callback?: () => void,
  ) => {
    output.push(
      typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk),
    )
    const done = typeof encoding === 'function' ? encoding : callback
    done?.()
    return true
  }) as typeof process.stdout.write
  process.exit = ((code?: number) => {
    throw new OutputExit(code ?? Number(process.exitCode ?? 0))
  }) as typeof process.exit
  const restoreShell = captureShellOutput(
    (text) => output.push(text),
    (error) => {
      shellError = error
    },
  )
  let result: unknown
  try {
    result = await action()
    if (shellError !== undefined) throw shellError
  } catch (error) {
    if (!(error instanceof OutputExit) || error.exitCode !== 0) {
      if (output.length) stderr(output.join(''))
      throw error
    }
  } finally {
    console.log = originals.log
    console.info = originals.info
    console.debug = originals.debug
    process.stdout.write = originals.write
    process.exit = originals.exit
    restoreShell()
  }
  const stdout = output.join('')
  if (isShellResult(result)) return { stdout, exitCode: result.exitCode }
  if (result === undefined) return stdout ? { stdout } : null
  if (stdout) stderr(stdout)
  return result
}

class OutputExit extends CommandError {
  constructor(exitCode: number) {
    super(`Command exited with code ${exitCode}`, {
      code: 'process_exit',
      exitCode,
    })
  }
}
