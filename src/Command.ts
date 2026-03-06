import { Argument } from './Argument'
import { installCompletion } from './completion'
import { Option } from './Option'
import { parseArgv } from './parseArgv'

export class Command {
  name?: string
  description?: string
  aliases: string[] = []
  action!: (...args: any[]) => void | Promise<void>
  arguments: Argument[] = []
  commands: Command[] = []
  options: Option[] = []
  #defaultCommand?: Command
  #extraHelp?: string

  meta(inputName: string, description = '') {
    const { name, aliases } = this.#parseAliases(inputName)
    this.name = name
    this.aliases = aliases
    this.description = description
    return this
  }

  help(text?: string) {
    if (text != null) {
      this.#extraHelp = text.trim()
      return this
    }
    console.log(this.helpText())
  }

  cmd(inputName?: string, description = '') {
    const command = new Command()
    if (inputName) {
      const { name, aliases } = this.#parseAliases(inputName)
      command.name = name
      command.aliases = aliases
      command.description = description
      this.commands.push(command)
    } else {
      this.#defaultCommand = command
    }
    return command
  }

  async invoke(text: string, ...args: any[]) {
    if (args.length === 0) {
      return this.parse(text.split(/ +/))
    }
    const command = this.#findCommand(text)
    if (!command) {
      throw new Error(`Unknown command: ${text}`)
    }
    return command.action?.(...args)
  }

  async runViaScriptJs() {
    installCompletion(this, { scriptPath: Bun.argv[2] })
    return this.parse(Bun.argv.slice(3))
  }

  // runViaBun
  async run() {
    installCompletion(this, { scriptPath: Bun.main })
    return this.parse(Bun.argv.slice(2))
  }

  async parse(argv: string[]): Promise<void> {
    const commandName = argv[0]
    if (commandName === '-h') {
      console.log(this.helpText())
      return process.exit(0)
    }
    if (!commandName) {
      if (this.#defaultCommand) {
        return this.#runDefault(argv)
      }
      console.log(this.helpText())
      return process.exit(0)
    }
    const command = this.#findCommand(commandName)
    if (!command) {
      if (this.#defaultCommand) {
        return this.#runDefault(argv)
      }
      console.log(this.helpText())
      console.error(`\nUnknown command: ${commandName}`)
      return process.exit(1)
    }
    const commandArgv = argv.slice(1)
    if (command.commands.length > 0 || command.#defaultCommand) {
      return command.parse(commandArgv)
    }
    if (commandArgv.includes('-h')) {
      console.log(command.helpText())
      return process.exit(0)
    }
    const { positionals, options } = parseArgv(
      commandArgv,
      command.arguments,
      command.options,
    )
    const context: Context = { argv: commandArgv }
    await this.#invokeAction(command, positionals, options, context)
  }

  add(...args: any[]) {
    if (typeof args[0] === 'function') {
      this.action = args[0]
    } else {
      let [inputName, description, completionOrDefault] = args

      if (typeof description !== 'string') {
        if (completionOrDefault) {
          throw new Error(
            'Invalid third argument, should be add(name, description, completion) format',
          )
        }
        completionOrDefault = description
        description = ''
      }

      const name = inputName.trim()
      if (name.startsWith('-')) {
        this.options.push(new Option(name, description, completionOrDefault))
      } else {
        this.arguments.push(
          new Argument(name, description, completionOrDefault),
        )
      }
    }

    return this
  }

  helpText() {
    const lines: string[] = []
    const name = this.name || 'app'
    if (this.commands.length > 0) {
      lines.push(`Usage: ${name} <command>`)
      lines.push('')
      lines.push('Commands:')
      const labels = this.commands.map((c) => {
        const names = [c.name, ...c.aliases]
          .sort((a, b) => (a?.length ?? 0) - (b?.length ?? 0))
          .join(', ')
        const args = c.#argsText()
        return args ? `${names} ${args}` : names
      })
      const maxLen = Math.max(...labels.map((l) => l.length))
      for (let i = 0; i < this.commands.length; i++) {
        const padded = labels[i].padEnd(maxLen + 2)
        lines.push(`  ${padded}${this.commands[i].description || ''}`)
      }
    } else {
      const args = this.#argsText()
      const usage = args ? `${name} ${args}` : name
      lines.push(`Usage: ${usage}`)
      if (this.description) {
        lines.push('')
        lines.push(this.description)
      }
      if (this.arguments.length > 0) {
        lines.push('')
        lines.push('Arguments:')
        const maxLen = Math.max(...this.arguments.map((a) => a.name.length))
        for (const arg of this.arguments) {
          const padded = arg.name.padEnd(maxLen + 2)
          const choices = Command.#choicesText(arg.completion)
          const desc = [arg.description, choices].filter(Boolean).join(' ')
          lines.push(`  ${padded}${desc}`)
        }
      }
      if (this.options.length > 0) {
        lines.push('')
        lines.push('Options:')
        const flags = this.options.map(String)
        const maxLen = Math.max(...flags.map((f) => f.length))
        for (let i = 0; i < this.options.length; i++) {
          const padded = flags[i].padEnd(maxLen + 2)
          const choices = Command.#choicesText(this.options[i].completion)
          const desc = [this.options[i].description, choices]
            .filter(Boolean)
            .join(' ')
          lines.push(`  ${padded}${desc}`)
        }
      }
    }
    if (this.#extraHelp) {
      lines.push('')
      lines.push(this.#extraHelp)
    }
    return lines.join('\n')
  }

  async #runDefault(argv: string[]) {
    const cmd = this.#defaultCommand as Command
    const { positionals, options } = parseArgv(argv, cmd.arguments, cmd.options)
    const context: Context = { argv }
    await this.#invokeAction(cmd, positionals, options, context)
  }

  async #invokeAction(
    command: Command,
    positionals: any[],
    options: Record<string, any>,
    context: Context,
  ) {
    const error =
      Command.#validateRequired(command, positionals) ??
      Command.#validateOptions(command, options) ??
      Command.#validateChoices(command, positionals)
    if (error) {
      console.log(command.helpText())
      console.error(`\n${error}`)
      return process.exit(1)
    }
    const args = [...positionals]
    if (command.options.length > 0) {
      args.push(options)
    }
    args.push(context)
    await command.action?.(...args)
  }

  #argsText() {
    return this.arguments.map(String).join(' ')
  }

  static #validateRequired(
    command: Command,
    positionals: any[],
  ): string | null {
    for (let i = 0; i < command.arguments.length; i++) {
      const arg = command.arguments[i]
      if (arg.required && positionals[i] == null) {
        return `Missing required argument: ${arg.rawName}`
      }
    }
    return null
  }

  static #validateOptions(
    command: Command,
    options: Record<string, any>,
  ): string | null {
    for (const opt of command.options) {
      if (opt.required && options[opt.attributeName] == null) {
        return `Missing required value for option: ${opt}`
      }
    }
    return null
  }

  static #validateChoices(command: Command, positionals: any[]): string | null {
    for (let i = 0; i < command.arguments.length; i++) {
      const arg = command.arguments[i]
      const value = positionals[i]
      if (value == null) continue
      if (typeof arg.completion === 'function') continue
      if (arg.completion.length === 0) continue
      if (arg.completion.some((c) => c.startsWith('$') || /^[<[]/.test(c)))
        continue
      // Extract keys from "key\tdescription" format for validation
      const keys = arg.completion.map((c) => c.split('\t')[0])
      const values = arg.variadic ? value : [value]
      for (const v of values) {
        if (!keys.includes(v)) {
          return `Invalid value for ${arg.name}: '${v}' (expected: ${keys.join(', ')})`
        }
      }
    }
    return null
  }

  static #choicesText(completion: string[] | (() => string[])): string {
    const values = typeof completion === 'function' ? completion() : completion
    if (values.length === 0) return ''
    const text = values.join(', ')
    if (text.length <= 40) return `(${text})`
    return `(${text.slice(0, 37)}...)`
  }

  #findCommand(name: string) {
    return this.commands.find(
      (command) => command.name === name || command.aliases.includes(name),
    )
  }

  #parseAliases(inputName: string) {
    const names = inputName.split('|').map((alias) => alias.trim())
    const [name, ...aliases] = names
    return { name, aliases }
  }
}

export const app = new Command()

type Context = {
  argv: string[]
}
