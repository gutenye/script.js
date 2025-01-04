import { Command as BaseCommand } from '@gutenye/commander-completion-carapace'

export * from '@gutenye/commander-completion-carapace'

export class Command extends BaseCommand {
  createCommand(name) {
    return new Command(name)
  }

  async invoke(text, ...args) {
    if (args.length === 0) {
      const args = text.split(/ +/)
      return program.parseAsync(args, { from: 'user' })
    } else {
      return program._findCommand(text)._actionHandler(...args)
    }
  }

  actionLin(fn) {
    this._actionLinux = fn
    this._actionOS()
    return this
  }

  actionMac(fn) {
    this._actionMac = fn
    this._actionOS()
    return this
  }

  actionWin(fn) {
    this._actionWin = fn
    this._actionOS()
    return this
  }

  _actionOS(fn) {
    this.action((...args) => {
      switch (process.platform) {
        case 'linux':
          return this._actionLinux?.(...args)
        case 'darwin':
          return this._actionMac?.(...args)
        case 'win32':
          return this._actionWin?.(...args)
      }
    })
  }
}

export const program = new Command()
