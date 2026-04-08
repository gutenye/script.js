import { Argument } from './Argument'
import { installCompletion } from './completion'
import { Option } from './Option'
import { parseArgv } from './parseArgv'

export class Command {
  static #nextOrder = 0

  name?: string
  description?: string
  aliases: string[] = []
  #displayAliases: string[] = []
  action!: (...args: any[]) => void | Promise<void>
  arguments: Argument[] = []
  commands: Command[] = []
  options: Option[] = []
  hidden = false
  #defaultCommand?: Command
  #extraHelp?: string
  // Root-level lookup for aliases on nested subcommands (e.g. cmd('wd, web dev') registers 'wd' here)
  #shortcutAliases = new Map<string, Command>()

  get shortcutAliases(): ReadonlyMap<string, Command> {
    return this.#shortcutAliases
  }

  get defaultCommand(): Command | undefined {
    return this.#defaultCommand
  }
  #order = Command.#nextOrder++

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
      const parts = name.split(/\s+/)
      let parent: Command = this
      for (let i = 0; i < parts.length - 1; i++) {
        const existing = parent.#findCommand(parts[i])
        if (existing) {
          parent = existing
        } else {
          const intermediate = new Command()
          intermediate.name = parts[i]
          parent.commands.push(intermediate)
          parent = intermediate
        }
      }
      command.name = parts[parts.length - 1]
      command.description = description
      parent.commands.push(command)
      if (parts.length > 1) {
        const prefix = parts.slice(0, -1).join(' ')
        const localAliases: string[] = []
        command.#displayAliases = [...aliases]
        for (const alias of aliases) {
          if (alias.includes(' ')) {
            const aliasParts = alias.split(/\s+/)
            const aliasPrefix = aliasParts.slice(0, -1).join(' ')
            if (aliasPrefix === prefix) {
              localAliases.push(aliasParts[aliasParts.length - 1])
            }
          } else {
            localAliases.push(alias)
            this.#shortcutAliases.set(alias, command)
          }
        }
        command.aliases = localAliases
      } else {
        command.aliases = aliases
      }
    } else {
      this.#defaultCommand = command
    }
    return command
  }

  cmdHide(inputName?: string, description = '') {
    const command = this.cmd(inputName, description)
    command.hidden = true
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
        const hasRequiredArg = this.#defaultCommand.arguments.some(
          (a) => a.required,
        )
        if (this.commands.length === 0 || !hasRequiredArg) {
          return this.#runDefault(argv)
        }
      }
      if (this.action) {
        return this.#runSelf(argv)
      }
      console.log(this.helpText())
      return process.exit(0)
    }
    const command = this.#findCommand(commandName)
    if (!command) {
      if (this.#defaultCommand) {
        return this.#runDefault(argv)
      }
      if (this.action) {
        return this.#runSelf(argv)
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
      const entries = this.#collectCommands().sort((a, b) => a.order - b.order)
      const defaultCmd = this.#defaultCommand
      if (defaultCmd) {
        for (const arg of defaultCmd.arguments) {
          const choices = Command.#choicesText(arg.completion)
          const desc = [arg.description, choices].filter(Boolean).join(' ')
          entries.push({ label: arg.rawName, description: desc, order: -1 })
        }
      }
      const maxLen = Math.max(...entries.map((e) => e.label.length))
      for (const entry of entries) {
        const padded = entry.label.padEnd(maxLen + 2)
        lines.push(`  ${padded}${entry.description}`)
      }
      if (defaultCmd && defaultCmd.options.length > 0) {
        lines.push('')
        lines.push('Default Command Options:')
        const flags = defaultCmd.options.map(String)
        const optMaxLen = Math.max(...flags.map((f) => f.length))
        for (let i = 0; i < defaultCmd.options.length; i++) {
          const padded = flags[i].padEnd(optMaxLen + 2)
          const choices = Command.#choicesText(defaultCmd.options[i].completion)
          const desc = [defaultCmd.options[i].description, choices]
            .filter(Boolean)
            .join(' ')
          lines.push(`  ${padded}${desc}`)
        }
      }
    } else {
      const args = this.#argsText()
      const usage = args ? `${name} ${args}` : name
      lines.push(`Usage: ${usage}`)
      if (this.description) {
        lines.push('')
        lines.push(this.description)
      }
      this.#appendArgsAndOptions(lines, this)
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

  async #runSelf(argv: string[]) {
    if (argv.includes('-h')) {
      console.log(this.helpText())
      return process.exit(0)
    }
    const { positionals, options } = parseArgv(
      argv,
      this.arguments,
      this.options,
    )
    const context: Context = { argv }
    await this.#invokeAction(this, positionals, options, context)
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

  #appendArgsAndOptions(lines: string[], source: Command) {
    if (source.arguments.length > 0) {
      lines.push('')
      lines.push('Arguments:')
      const maxLen = Math.max(...source.arguments.map((a) => a.name.length))
      for (const arg of source.arguments) {
        const padded = arg.name.padEnd(maxLen + 2)
        const choices = Command.#choicesText(arg.completion)
        const desc = [arg.description, choices].filter(Boolean).join(' ')
        lines.push(`  ${padded}${desc}`)
      }
    }
    if (source.options.length > 0) {
      lines.push('')
      lines.push('Options:')
      const flags = source.options.map(String)
      const maxLen = Math.max(...flags.map((f) => f.length))
      for (let i = 0; i < source.options.length; i++) {
        const padded = flags[i].padEnd(maxLen + 2)
        const choices = Command.#choicesText(source.options[i].completion)
        const desc = [source.options[i].description, choices]
          .filter(Boolean)
          .join(' ')
        lines.push(`  ${padded}${desc}`)
      }
    }
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

  #collectCommands(
    prefix = '',
  ): { label: string; description: string; order: number }[] {
    const result: { label: string; description: string; order: number }[] = []
    for (const c of this.commands) {
      if (c.hidden) continue
      if (c.description || c.action) {
        let label: string
        if (prefix && c.aliases.length > 0) {
          const fullPath = `${prefix} ${c.name}`
          const displayAliases =
            c.#displayAliases.length > 0 ? c.#displayAliases : c.aliases
          label = [...displayAliases, fullPath]
            .sort((a, b) => a.length - b.length)
            .join(', ')
        } else {
          const names = [c.name, ...c.aliases]
            .sort((a, b) => (a?.length ?? 0) - (b?.length ?? 0))
            .join(', ')
          label = prefix ? `${prefix} ${names}` : names
        }
        const args = c.#argsText()
        if (args) label = `${label} ${args}`
        result.push({
          label,
          description: c.description || '',
          order: c.#order,
        })
      }
      if (c.commands.length > 0) {
        const childPrefix = prefix ? `${prefix} ${c.name}` : c.name!
        result.push(...c.#collectCommands(childPrefix))
      }
    }
    return result
  }

  #findCommand(name: string) {
    return (
      this.commands.find(
        (command) => command.name === name || command.aliases.includes(name),
      ) || this.#shortcutAliases.get(name)
    )
  }

  #parseAliases(inputName: string) {
    const names = inputName.split(',').map((alias) => alias.trim())
    // Single-word entries after a multi-word entry inherit its prefix
    // e.g. 'web d, dev' → ['web d', 'web dev']
    // e.g. 'wd, web d, dev' → ['wd', 'web d', 'web dev']
    let prefix = ''
    for (let i = 0; i < names.length; i++) {
      if (names[i].includes(' ')) {
        prefix = names[i].split(/\s+/).slice(0, -1).join(' ')
      } else if (prefix) {
        names[i] = `${prefix} ${names[i]}`
      }
    }
    names.sort((a, b) => b.length - a.length)
    const [name, ...aliases] = names
    return { name, aliases }
  }
}

export const app = new Command()

type Context = {
  argv: string[]
}
