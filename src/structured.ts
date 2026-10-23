import { ShellError } from './spawn'

// Results and errors of apps that call app.json(): data on stdout, errors on stderr, both JSON when asked or piped

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

export function printResult(result: unknown, { json }: { json: boolean }) {
  if (result === undefined) return
  if (json) {
    console.log(JSON.stringify(result))
    return
  }
  console.log(
    typeof result === 'string' ? result : JSON.stringify(result, null, 2),
  )
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
