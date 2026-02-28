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
  a = this.add.bind(this)
  cmd = this.command.bind(this)

  define(inputName: string, description = '') {
    const { name, aliases } = this.#parseAliases(inputName)
    this.name = name
    this.aliases = aliases
    this.description = description
    return this
  }

  command(inputName: string, description = '') {
    const command = new Command()
    const { name, aliases } = this.#parseAliases(inputName)
    command.name = name
    command.aliases = aliases
    command.description = description
    this.commands.push(command)
    return command
  }

  async run(argv = Bun.argv.slice(2)) {
    const commandName = argv[0]
    const command = this.#findCommand(commandName)
    if (command) {
      const commandArgv = argv.slice(1)
      const { positionals, options } = parseArgv(
        commandArgv, command.arguments, command.options,
      )
      const context: Context = { args: commandArgv }
      await command.action?.(...positionals, options, context)
    } else {
      console.log(this.name, this.description)
      console.log(JSON.stringify(this.commands, null, 2))
    }
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
        this.arguments.push(new Argument(name, description, completionOrDefault))
      }
    }

    return this
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
  args: string[]
}
