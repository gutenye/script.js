import { Argument } from './Argument'
import { Option } from './Option'

class Command {
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

  async run() {
    const args = Bun.argv.slice(2)
    const commandName = args[0]
    const command = this.#findCommand(commandName)
    if (command) {
      const context: Context = {
        args,
      }
      const options = {}
      await command.action?.(args, options, context)
    } else {
      console.log(this.name, this.description)
      console.log(JSON.stringify(this.commands, null, 2))
    }
  }

  add(...args: any[]) {
    if (typeof args[0] === 'function') {
      this.action = args[0]
    } else {
      let [inputName, description, completion] = args
      if (typeof description !== 'string') {
        if (completion) {
          throw new Error(
            'Invalid third argument for ${name}, should be a(name, description, completion) format',
          )
        }
        completion = description
        description = ''
      }

      const name = inputName.trim()
      if (name.startsWith('-')) {
        this.options.push(new Option(name, description, completion))
      } else {
        this.arguments.push(new Argument(name, description, completion))
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
