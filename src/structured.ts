import { ShellError } from './spawn'

// Returned data goes to stdout; errors go to stderr, with --json available in every app.

export const USAGE_EXIT_CODE = 2

type CommandErrorDetails = {
  code?: string
  exitCode?: number
  data?: unknown
}

// An expected failure with a stable code that callers can branch on, such as 'no_device'
export class CommandError extends Error {
  code: string
  exitCode: number
  data?: unknown

  constructor(
    message: string,
    { code = 'error', exitCode = 1, data }: CommandErrorDetails = {},
  ) {
    super(message)
    this.code = code
    this.exitCode = exitCode
    this.data = data
  }
}

export async function printResult(
  result: unknown,
  { json }: { json: boolean },
) {
  if (result === undefined) return
  const text =
    typeof result === 'string' && !json
      ? result
      : JSON.stringify(result, null, json ? undefined : 2)
  if (json && text === undefined) {
    throw new CommandError('Command result is not JSON-serializable', {
      code: 'invalid_result',
    })
  }
  // Await the stream callback so piped output drains before exit.
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(`${text}\n`, (error) =>
      error ? reject(error) : resolve(),
    )
  })
}

export function printError(
  error: { code: string; message: string; data?: unknown },
  { json }: { json: boolean },
) {
  if (json) {
    console.error(JSON.stringify({ error }))
    return
  }
  console.error(`Error: ${error.message}`)
}

// Any thrown value as { code, message, exitCode }; shell failures carry their exit code
export function toErrorShape(error: unknown) {
  if (error instanceof CommandError) {
    return {
      code: error.code,
      message: error.message,
      exitCode: error.exitCode,
      ...(error.data === undefined ? {} : { data: error.data }),
    }
  }
  if (error instanceof ShellError) {
    return {
      code: 'shell_failed',
      message: error.message,
      exitCode: error.exitCode || 1,
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  const code =
    error instanceof Error && typeof (error as any).code === 'string'
      ? (error as any).code
      : 'error'
  return { code, message, exitCode: 1 }
}
