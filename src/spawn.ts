import { exitWithError } from './helpers/exitWithError'

const defaults: {
  cwd: string | undefined
  env: Record<string, string> | undefined
  preambles: { text: string; cwd?: string }[]
} = {
  cwd: undefined,
  env: undefined,
  preambles: [],
}

type ShellResult = {
  exitCode: number | null
  stdout?: { toString(): string } | null
  stderr?: { toString(): string } | null
}

export class ShellError extends Error {
  command: string
  exitCode: number
  stdout: string
  stderr: string
  timeoutMs?: number

  constructor(command: string, result: ShellResult, timeoutMs?: number) {
    const trimmed = command.trim()
    super(
      timeoutMs === undefined
        ? `Command failed with exit code ${result.exitCode}: ${trimmed}`
        : `Command timed out after ${timeoutMs}ms: ${trimmed}`,
    )
    this.command = trimmed
    this.exitCode = result.exitCode as number
    this.stdout = (result.stdout ?? '').toString()
    this.stderr = (result.stderr ?? '').toString()
    this.timeoutMs = timeoutMs
  }
}

class ShellCommand {
  #command: string
  #result: ReturnType<typeof Bun.spawnSync> | undefined
  #cwd: string | undefined
  #env: Record<string, string> | undefined
  #nothrow = false
  #timeoutMs: number | undefined

  constructor(command: string) {
    this.#command = command
  }

  get #fullCommand() {
    const cwd = this.#cwd ?? defaults.cwd
    const preamble = defaults.preambles
      .filter((p) => !p.cwd || p.cwd === cwd)
      .map((p) => p.text)
      .join('')
    return preamble ? preamble + this.#command : this.#command
  }

  #spawnOptions(stdout: 'pipe' | 'inherit') {
    const opts: {
      stdio: ['inherit', 'pipe' | 'inherit', 'inherit']
      cwd?: string
      env?: Record<string, string | undefined>
      timeout?: number
    } = { stdio: ['inherit', stdout, 'inherit'] }
    const cwd = this.#cwd ?? defaults.cwd
    if (cwd !== undefined) opts.cwd = cwd
    if (defaults.env !== undefined || this.#env !== undefined)
      opts.env = { ...process.env, ...defaults.env, ...this.#env }
    if (this.#timeoutMs !== undefined) opts.timeout = this.#timeoutMs
    return opts
  }

  #pipeExec() {
    if (!this.#result) {
      this.#result = Bun.spawnSync(
        ['sh', '-c', this.#fullCommand],
        this.#spawnOptions('pipe'),
      )
    }
    return this.#result
  }

  #throwUnlessSucceeded(result: ShellResult, timedOut: boolean) {
    if (result.exitCode === 0 || this.#nothrow) return
    throw new ShellError(
      this.#command,
      result,
      timedOut ? this.#timeoutMs : undefined,
    )
  }

  inheritExec() {
    const result = Bun.spawnSync(
      ['sh', '-c', this.#fullCommand],
      this.#spawnOptions('inherit'),
    )
    this.#throwUnlessSucceeded(result, result.exitedDueToTimeout === true)
    return result
  }

  // Awaited commands run without blocking, so Promise.all([$`a`, $`b`]) runs them in parallel
  async #inheritExecAsync() {
    const subprocess = Bun.spawn(
      ['sh', '-c', this.#fullCommand],
      this.#spawnOptions('inherit'),
    )
    await subprocess.exited
    const result = { exitCode: subprocess.exitCode }
    const timedOut =
      this.#timeoutMs !== undefined &&
      subprocess.killed &&
      subprocess.signalCode !== null
    this.#throwUnlessSucceeded(result, timedOut)
    return result
  }

  cwd(path: string) {
    this.#cwd = path
    return this
  }

  nothrow() {
    this.#nothrow = true
    return this
  }

  env(vars: Record<string, string>) {
    this.#env = vars
    return this
  }

  // Kills the command with SIGTERM once it runs longer than ms
  timeout(ms: number) {
    this.#timeoutMs = ms
    return this
  }

  get exitCode() {
    return this.#pipeExec().exitCode
  }

  text() {
    const result = this.#pipeExec()
    this.#throwUnlessSucceeded(result, result.exitedDueToTimeout === true)
    return (result.stdout ?? '').toString().trimEnd()
  }

  json() {
    return JSON.parse(this.text())
  }

  lines() {
    const lines = this.text().split('\n')
    // fix '' issue
    if (lines.length === 1 && lines[0] === '') {
      return []
    } else {
      // fix '  a\n  b\n' issue, space at start
      return lines.map((v) => v.trim())
    }
  }

  // biome-ignore lint/suspicious/noThenProperty: thenable for await $`cmd`
  then<Result = { exitCode: number | null }, Rejected = never>(
    resolve?: (value: { exitCode: number | null }) => Result,
    reject?: (reason: unknown) => Rejected,
  ) {
    return this.#inheritExecAsync().then(resolve, reject)
  }

  toString() {
    return this.text()
  }
}

const CAPTURED_PROPS = ['text', 'json', 'lines', 'exitCode', 'then', 'toString']
// Chaining only configures the command, so an un-awaited $`cmd`.cwd(dir) still runs
const CHAINABLE_PROPS = ['cwd', 'env', 'nothrow', 'timeout']

function $tag(strings: TemplateStringsArray, ...values: any[]): ShellCommand {
  const command = buildCommand(strings, values)
  const output = new ShellCommand(command)

  let captured = false
  const proxy = new Proxy(output, {
    get(target, prop, receiver) {
      if (CAPTURED_PROPS.includes(prop as string)) {
        captured = true
      }
      const value = Reflect.get(target, prop, target)
      if (typeof value === 'function') {
        const bound = value.bind(target)
        if (CHAINABLE_PROPS.includes(prop as string)) {
          return (...args: any[]) => {
            bound(...args)
            return receiver
          }
        }
        return bound
      }
      return value
    },
  })

  queueMicrotask(() => {
    if (!captured) {
      try {
        output.inheritExec()
      } catch (error) {
        exitOnShellError(error)
      }
    }
  })

  return proxy
}

$tag.cwd = (path: string) => {
  defaults.cwd = path
}
$tag.env = (vars: Record<string, string>) => {
  defaults.env = vars
}
$tag.global = (strings: TemplateStringsArray, ...values: any[]) => {
  const text = buildCommand(strings, values) + '\n'
  const entry: { text: string; cwd?: string } = { text }
  defaults.preambles.push(entry)
  return {
    cwd(path: string) {
      entry.cwd = path
    },
  }
}

export { $tag as $ }

// the failed command already printed its own stderr, so keep the report to one line
export function exitOnShellError(error: unknown) {
  if (!(error instanceof ShellError)) throw error
  // signal-killed commands report a null exit code, which would exit 0
  const code = error.exitCode || 1
  const reason =
    error.timeoutMs === undefined
      ? `exit ${code}`
      : `timed out after ${error.timeoutMs}ms`
  exitWithError(`${error.command} (${reason})`, undefined, code)
}

function buildCommand(strings: TemplateStringsArray, values: any[]) {
  let result = ''
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]
    if (i < values.length) {
      const value = values[i]
      if (Array.isArray(value)) {
        result += value.map(escapeArg).join(' ')
      } else {
        result += escapeArg(String(value))
      }
    }
  }
  return result
}

function escapeArg(arg: string): string {
  if (arg === '') return "''"
  if (/^[a-zA-Z0-9._\-/=:@]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, "'\\''")}'`
}
