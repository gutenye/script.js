const defaults: {
  cwd: string | undefined
  env: Record<string, string> | undefined
  preamble: string
} = {
  cwd: undefined,
  env: undefined,
  preamble: '',
}

export class ShellError extends Error {
  exitCode: number
  stdout: string
  stderr: string

  constructor(command: string, result: ReturnType<typeof Bun.spawnSync>) {
    super(`Command failed with exit code ${result.exitCode}: ${command}`)
    this.exitCode = result.exitCode
    this.stdout = (result.stdout ?? '').toString()
    this.stderr = (result.stderr ?? '').toString()
  }
}

class ShellCommand {
  #command: string
  #result: ReturnType<typeof Bun.spawnSync> | undefined
  #cwd: string | undefined
  #env: Record<string, string> | undefined

  constructor(command: string) {
    this.#command = command
  }

  get #fullCommand() {
    return defaults.preamble ? defaults.preamble + this.#command : this.#command
  }

  #pipeExec() {
    if (!this.#result) {
      const opts: Parameters<typeof Bun.spawnSync>[1] = {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'inherit',
      }
      const cwd = this.#cwd ?? defaults.cwd
      const env = this.#env ?? defaults.env
      if (cwd !== undefined) opts.cwd = cwd
      if (env !== undefined) opts.env = env
      this.#result = Bun.spawnSync(['sh', '-c', this.#fullCommand], opts)
    }
    return this.#result
  }

  inheritExec() {
    const opts: Parameters<typeof Bun.spawnSync>[1] = {
      stdio: ['inherit', 'inherit', 'inherit'],
    }
    const cwd = this.#cwd ?? defaults.cwd
    const env = this.#env ?? defaults.env
    if (cwd !== undefined) opts.cwd = cwd
    if (env !== undefined) opts.env = env
    Bun.spawnSync(['sh', '-c', this.#fullCommand], opts)
  }

  cwd(path: string) {
    this.#cwd = path
    return this
  }

  env(vars: Record<string, string>) {
    this.#env = vars
    return this
  }

  get exitCode() {
    return this.#pipeExec().exitCode
  }

  text() {
    const result = this.#pipeExec()
    if (result.exitCode !== 0) {
      throw new ShellError(this.#command, result)
    }
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
  then(resolve?: (value: undefined) => void) {
    this.inheritExec()
    resolve?.(undefined)
  }

  toString() {
    return this.text()
  }
}

const CAPTURED_PROPS = [
  'text',
  'json',
  'lines',
  'exitCode',
  'cwd',
  'env',
  'then',
]
const CHAINABLE_PROPS = ['cwd', 'env']

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
      output.inheritExec()
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
  defaults.preamble += buildCommand(strings, values) + '\n'
}

export { $tag as $ }

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
