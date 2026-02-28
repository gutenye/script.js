import { Argument } from './Argument'
import { Option } from './Option'
import { parseArgv } from './parseArgv'

export class Command {
  name?: string
  description?: string
  aliases: string[] = []
  action: (...args: any[]) => void | Promise<void>
  arguments: Argument[] = []
  commands: Command[] = []
  options: Option[] = []
  #defaultCommand?: Command
  #extraHelp?: string
  a = this.add.bind(this)
  cmd = this.command.bind(this)

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

  command(inputName?: string, description = '') {
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

  async run(argv = Bun.argv.slice(2)) {
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
            'Invalid third argument, should be a(name, description, completion) format',
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
      const labels = this.commands.map((c) =>
        [c.name, ...c.aliases].sort((a, b) => a.length - b.length).join(', '),
      )
      const maxLen = Math.max(...labels.map((l) => l.length))
      for (let i = 0; i < this.commands.length; i++) {
        const padded = labels[i].padEnd(maxLen + 2)
        lines.push(`  ${padded}${this.commands[i].description || ''}`)
      }
    } else {
      const args = this.arguments.map((a) =>
        a.required ? `<${a.name}>` : `[${a.name}]`,
      )
      const usage = [name, ...args].join(' ')
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
          lines.push(`  ${padded}${arg.description || ''}`)
        }
      }
      if (this.options.length > 0) {
        lines.push('')
        lines.push('Options:')
        const flags = this.options.map((o) =>
          [o.short, o.long].filter(Boolean).join(', '),
        )
        const maxLen = Math.max(...flags.map((f) => f.length))
        for (let i = 0; i < this.options.length; i++) {
          const padded = flags[i].padEnd(maxLen + 2)
          lines.push(`  ${padded}${this.options[i].description || ''}`)
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
    const cmd = this.#defaultCommand!
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
    const args = [...positionals]
    if (command.options.length > 0) {
      args.push(options)
    }
    args.push(context)
    await command.action?.(...args)
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

export const cmd = app.cmd

type Context = {
  argv: string[]
}
