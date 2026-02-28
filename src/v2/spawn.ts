export const $defaults: {
  cwd: string | undefined
  env: Record<string, string> | undefined
} = {
  cwd: undefined,
  env: undefined,
}

class ShellCommand {
  #command: string
  #result: ReturnType<typeof Bun.spawnSync> | undefined
  #cwd: string | undefined
  #env: Record<string, string> | undefined
  #quiet = false

  constructor(command: string) {
    this.#command = command
  }

  #exec() {
    if (!this.#result) {
      const opts: Parameters<typeof Bun.spawnSync>[1] = {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'inherit',
      }
      const cwd = this.#cwd ?? $defaults.cwd
      const env = this.#env ?? $defaults.env
      if (cwd !== undefined) opts.cwd = cwd
      if (env !== undefined) opts.env = env
      this.#result = Bun.spawnSync(['sh', '-c', this.#command], opts)
    }
    return this.#result
  }

  inheritExec() {
    const opts: Parameters<typeof Bun.spawnSync>[1] = {
      stdio: ['inherit', 'inherit', 'inherit'],
    }
    const cwd = this.#cwd ?? $defaults.cwd
    const env = this.#env ?? $defaults.env
    if (cwd !== undefined) opts.cwd = cwd
    if (env !== undefined) opts.env = env
    Bun.spawnSync(['sh', '-c', this.#command], opts)
  }

  cwd(path: string) {
    this.#cwd = path
    return this
  }

  env(vars: Record<string, string>) {
    this.#env = vars
    return this
  }

  quiet() {
    this.#quiet = true
    return this
  }

  get exitCode() {
    return this.#exec().exitCode
  }

  text() {
    const { stdout } = this.#exec()
    return (stdout ?? '').toString()
  }

  json() {
    return JSON.parse(this.text())
  }

  lines() {
    return this.text().split('\n').filter(Boolean)
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then(resolve?: (value: void) => void) {
    this.inheritExec()
    resolve?.()
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
  'quiet',
  'then',
]
const CHAINABLE_PROPS = ['cwd', 'env', 'quiet']

export function $(
  strings: TemplateStringsArray,
  ...values: any[]
): ShellCommand {
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
  if (/^[a-zA-Z0-9._\-\/=:@]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, "'\\''")}'`
}
