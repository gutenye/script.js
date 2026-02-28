class ShellOutput {
  #command: string
  #result: ReturnType<typeof Bun.spawnSync> | undefined

  constructor(command: string) {
    this.#command = command
  }

  #exec() {
    if (!this.#result) {
      this.#result = Bun.spawnSync(['sh', '-c', this.#command], {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'inherit',
      })
    }
    return this.#result
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

  toString() {
    return this.text()
  }
}

export function $(
  strings: TemplateStringsArray,
  ...values: any[]
): ShellOutput {
  const command = buildCommand(strings, values)
  const output = new ShellOutput(command)

  let captured = false
  const proxy = new Proxy(output, {
    get(target, prop, receiver) {
      if (
        prop === 'text' ||
        prop === 'json' ||
        prop === 'lines' ||
        prop === 'exitCode'
      ) {
        captured = true
      }
      return Reflect.get(target, prop, receiver)
    },
  })

  queueMicrotask(() => {
    if (!captured) {
      Bun.spawnSync(['sh', '-c', command], {
        stdio: ['inherit', 'inherit', 'inherit'],
      })
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
