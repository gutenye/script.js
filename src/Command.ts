import path from 'node:path'
import { Argument } from './Argument'
import {
  getAkeSuffix,
  getCompletionName,
  getProjectDir,
  isAke,
} from './ake/shared'
import type {
  AddArgument,
  AddOption,
  CompletionOrDefault,
  Context,
  Handler,
  NoOptions,
} from './CommandTypes'
import { installCompletion } from './completion'
import { describeCommand, staticChoices } from './describe'
import { serveMcp } from './mcp'
import { Option } from './Option'
import { closestMatch, findOption, parseArgv, wantsHelp } from './parseArgv'
import { exitOnShellError } from './spawn'
import {
  CommandError,
  printError,
  printResult,
  toErrorShape,
  USAGE_EXIT_CODE,
} from './structured'
import { UsageError } from './UsageError'

// Args and Opts type the handler from the add() strings; see CommandTypes.ts
export class Command<Args extends unknown[] = any[], Opts = any> {
  static #nextOrder = 0

  _name?: string
  description?: string
  aliases: string[] = []
  action?: (...args: any[]) => unknown
  arguments: Argument[] = []
  commands: Command[] = []
  options: Option[] = []
  // Options this command and every descendant accept, declared with global()
  globalOptions: Option[] = []
  parent?: Command
  hidden = false
  examples: { command: string; description: string }[] = []
  #defaultCommand?: Command
  #extraHelp?: string
  #isStructured = false
  #timeoutMs?: number
  #runPromise?: Promise<void>
  #sections: { name: string; order: number }[] = []
  // Root-level lookup for aliases on nested subcommands (e.g. cmd('wd, web dev') registers 'wd' here)
  #shortcutAliases = new Map<string, Command>()

  get shortcutAliases(): ReadonlyMap<string, Command> {
    return this.#shortcutAliases
  }

  get defaultCommand(): Command | undefined {
    return this.#defaultCommand
  }
  #order = Command.#nextOrder++

  name(inputName: string, description = '') {
    const { name, aliases } = this.#parseAliases(inputName)
    this._name = name
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

  cmd(inputName?: string, description = ''): Command<[], NoOptions> {
    const command = new Command<[], NoOptions>()
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
          intermediate._name = parts[i]
          intermediate.parent = parent
          parent.commands.push(intermediate)
          parent = intermediate
        }
      }
      command._name = parts[parts.length - 1]
      command.description = description
      command.parent = parent
      parent.commands.push(command)
      if (parts.length > 1) {
        const prefix = parts.slice(0, -1).join(' ')
        const localAliases: string[] = []
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
      command.parent = this
      this.#defaultCommand = command
    }
    return command
  }

  cmdHide(inputName?: string, description = '') {
    const command = this.cmd(inputName, description)
    command.hidden = true
    return command
  }

  section(name: string) {
    this.#sections.push({ name, order: Command.#nextOrder++ })
    return this
  }

  // Shown under Examples in help and in `--help --json`; agents learn a command fastest from one real call
  example(command: string, description = '') {
    this.examples.push({ command, description })
    return this
  }

  // Structured output for the whole app: a handler returns its result, printed as JSON with --json or when piped
  json() {
    const root = this.root
    if (root.#isStructured) return this
    root.#isStructured = true
    root.global(
      '--json',
      'Print the result as JSON; the default when output is piped',
    )
    return this
  }

  // Fails the action once it runs longer than ms; the nearest ancestor's limit applies to subcommands
  timeout(ms: number) {
    this.#timeoutMs = ms
    return this
  }

  describe() {
    return describeCommand(this)
  }

  get root(): Command {
    let command: Command = this
    while (command.parent) command = command.parent
    return command
  }

  // 'exodusctl open', for usage lines and hints
  get path(): string {
    const names: string[] = []
    for (let command: Command | undefined = this; command; ) {
      if (command._name) names.unshift(command._name)
      command = command.parent
    }
    return names.join(' ') || 'app'
  }

  get usage(): string {
    if (this.commands.length > 0 && !this.action)
      return `${this.path} <command>`
    const args = this.#argsText()
    return args ? `${this.path} ${args}` : this.path
  }

  // Parses argv for this command and returns what its action returns, without printing it
  async execute(argv: string[]) {
    return Command.#execute(this, argv, { interceptHelp: true, print: false })
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

  async run() {
    if (this === app) {
      process.off('beforeExit', runAppBeforeExit)
    }
    if (this.#runPromise) return this.#runPromise
    this.#runPromise = this.#runOnce()
    return this.#runPromise
  }

  async #runOnce() {
    try {
      const isScriptJs = (globalThis as any).app === this
      const scriptPath = isScriptJs ? Bun.argv[2] : Bun.main
      const argv = isScriptJs ? Bun.argv.slice(3) : Bun.argv.slice(2)
      this.#setupAke(scriptPath)
      installCompletion(this)
      if (argv[0] === '--mcp') {
        await serveMcp(this)
        return
      }
      await this.parse(argv)
    } catch (error) {
      if (error instanceof CommandError) {
        printError(toErrorShape(error), { json: false })
        process.exit(error.exitCode)
      }
      exitOnShellError(error)
    }
  }

  #setupAke(scriptPath: string) {
    if (!isAke(scriptPath)) return
    if (!this._name) {
      const suffix = getAkeSuffix(path.basename(scriptPath)) ?? ''
      this._name = getCompletionName(suffix)
    }
    const projectDir = getProjectDir(scriptPath)
    process.chdir(projectDir)
    ;(globalThis as any).PROJECT_DIR = projectDir
  }

  async parse(inputArgv: string[]): Promise<void> {
    // Global options may come before the command name: `app -d iPhone state`
    const { leadingGlobals, argv } = this.#takeLeadingGlobals(inputArgv)
    const commandName = argv[0]
    if (commandName === '-h' || commandName === '--help') {
      Command.#printHelp(this, argv)
      return process.exit(0)
    }
    if (!commandName) {
      if (this.#defaultCommand) {
        const hasRequiredArg = this.#defaultCommand.arguments.some(
          (a) => a.required,
        )
        if (this.commands.length === 0 || !hasRequiredArg) {
          return this.#runDefault(leadingGlobals)
        }
      }
      if (this.action) {
        return this.#runSelf(leadingGlobals)
      }
      console.log(this.helpText())
      return process.exit(0)
    }
    const command = this.#findCommand(commandName)
    if (!command) {
      if (this.#defaultCommand) {
        return this.#runDefault([...leadingGlobals, ...argv])
      }
      if (this.action) {
        return this.#runSelf([...leadingGlobals, ...argv])
      }
      const names = this.commands
        .filter((command) => !command.hidden)
        .flatMap((command) => [command._name as string, ...command.aliases])
      const suggestion = closestMatch(commandName, names)
      return Command.#exitWithUsage(this, inputArgv, {
        code: 'unknown_command',
        message: suggestion
          ? `Unknown command: ${commandName} (did you mean ${suggestion}?)`
          : `Unknown command: ${commandName}`,
      })
    }
    const commandArgv = [...leadingGlobals, ...argv.slice(1)]
    if (command.commands.length > 0 || command.#defaultCommand) {
      return command.parse(commandArgv)
    }
    await Command.#execute(command, commandArgv, {
      interceptHelp: true,
      print: true,
    })
  }

  add(action: Handler<Args, Opts>): this
  add<Raw extends string>(
    name: Raw,
    description?: string | CompletionOrDefault,
    completionOrDefault?: CompletionOrDefault,
  ): Command<AddArgument<Args, Raw>, AddOption<Opts, Raw>>
  add(...args: any[]): any {
    if (typeof args[0] === 'function') {
      this.action = args[0]
    } else {
      const { name, description, completionOrDefault } =
        Command.#normalizeAddArgs(args)
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

  // Declares an option that this command and every descendant accept, before or after the command name
  global(...args: any[]) {
    const { name, description, completionOrDefault } =
      Command.#normalizeAddArgs(args)
    if (!name.startsWith('-')) {
      throw new Error(`global() takes an option, got '${name}'`)
    }
    this.globalOptions.push(new Option(name, description, completionOrDefault))
    return this
  }

  // Applies reusable fragments in place, so shared arguments and options keep the position they are used at
  use(...mixins: Mixin[]) {
    for (const mixin of mixins) {
      mixin(this)
    }
    return this
  }

  // Global options from this command and its ancestors, nearest first; a nearer one replaces a clashing farther one
  get visibleGlobalOptions(): Option[] {
    const result: Option[] = []
    for (let command: Command | undefined = this; command; ) {
      for (const option of command.globalOptions) {
        if (!result.some((existing) => existing.overlaps(option))) {
          result.push(option)
        }
      }
      command = command.parent
    }
    return result
  }

  // Global options this command inherits, minus any its own options redeclare
  get inheritedOptions(): Option[] {
    return this.visibleGlobalOptions.filter(
      (option) => !this.options.some((own) => own.overlaps(option)),
    )
  }

  // Everything the parser accepts for this command
  get effectiveOptions(): Option[] {
    return [...this.options, ...this.inheritedOptions]
  }

  helpText() {
    const lines: string[] = []
    if (this.commands.length > 0) {
      lines.push(`Usage: ${this.path} <command>`)
      lines.push('')
      lines.push('Commands:')
      const entries: HelpEntry[] = this.#collectCommands()
      const defaultCmd = this.#defaultCommand
      if (defaultCmd) {
        for (const arg of defaultCmd.arguments) {
          const choices = Command.#choicesText(arg.completion)
          const desc = [arg.description, choices].filter(Boolean).join(' ')
          entries.push({
            type: 'command',
            label: arg.rawName,
            description: desc,
            order: -1,
          })
        }
      }
      entries.push(
        ...this.#sections.map(
          ({ name, order }): HelpEntry => ({ type: 'section', name, order }),
        ),
      )
      entries.sort((a, b) => a.order - b.order)
      const commands = entries.filter(
        (entry): entry is CommandHelpEntry => entry.type === 'command',
      )
      const maxLen = Math.max(...commands.map((entry) => entry.label.length))
      for (const entry of entries) {
        if (entry.type === 'section') {
          lines.push('')
          lines.push(`(${entry.name})`)
          continue
        }
        const padded = entry.label.padEnd(maxLen + 2)
        lines.push(`  ${padded}${entry.description}`)
      }
      if (defaultCmd) {
        Command.#appendOptions(
          lines,
          'Default Command Options',
          defaultCmd.options,
        )
      }
      Command.#appendOptions(lines, 'Global Options', this.visibleGlobalOptions)
    } else {
      lines.push(`Usage: ${this.usage}`)
      if (this.description) {
        lines.push('')
        lines.push(this.description)
      }
      this.#appendArgsAndOptions(lines, this)
      Command.#appendOptions(lines, 'Global Options', this.inheritedOptions)
    }
    if (this.examples.length > 0) {
      lines.push('')
      lines.push('Examples:')
      const width = Math.max(...this.examples.map((e) => e.command.length))
      for (const { command, description } of this.examples) {
        lines.push(`  ${command.padEnd(width + 2)}${description}`.trimEnd())
      }
    }
    if (this.#extraHelp) {
      lines.push('')
      lines.push(this.#extraHelp)
    }
    return lines.join('\n')
  }

  async #runDefault(argv: string[]) {
    // A default command usually forwards its argv, so -h reaches the wrapped tool unless the command declares something
    const cmd = this.#defaultCommand as Command
    await Command.#execute(cmd, argv, {
      interceptHelp: Command.#isStrict(cmd),
      print: true,
    })
  }

  async #runSelf(argv: string[]) {
    await Command.#execute(this, argv, { interceptHelp: true, print: true })
  }

  // print: the CLI path prints a structured app's result and error; execute() hands them to its caller instead
  static async #execute(
    command: Command,
    argv: string[],
    { interceptHelp, print }: { interceptHelp: boolean; print: boolean },
  ) {
    if (interceptHelp && wantsHelp(argv)) {
      Command.#printHelp(command, argv)
      return process.exit(0)
    }
    const effectiveOptions = command.effectiveOptions
    let parsed: ReturnType<typeof parseArgv>
    try {
      parsed = parseArgv(argv, command.arguments, effectiveOptions, {
        strict: Command.#isStrict(command),
      })
    } catch (error) {
      if (!(error instanceof UsageError)) throw error
      return Command.#exitWithUsage(command, argv, {
        code: 'usage',
        message: error.message,
      })
    }
    const { positionals, options } = parsed
    const error =
      Command.#validateRequired(command, positionals) ??
      Command.#validateOptions(effectiveOptions, options) ??
      Command.#validateChoices(command, positionals) ??
      Command.#validateOptionChoices(effectiveOptions, options)
    if (error) {
      return Command.#exitWithUsage(command, argv, {
        code: 'usage',
        message: error,
      })
    }
    const json = Command.#isJsonOutput(command, argv)
    const args = [...positionals]
    if (effectiveOptions.length > 0) {
      args.push(options)
    }
    const context: Context = { argv, json }
    args.push(context)
    if (!print || !command.root.#isStructured) {
      return Command.#runAction(command, args)
    }
    try {
      const result = await Command.#runAction(command, args)
      printResult(result, { json })
      return result
    } catch (actionError) {
      const { exitCode, ...shape } = toErrorShape(actionError)
      printError(shape, { json })
      return process.exit(exitCode)
    }
  }

  static async #runAction(command: Command, args: unknown[]) {
    const timeoutMs = Command.#timeoutFor(command)
    if (timeoutMs === undefined) return command.action?.(...args)
    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new CommandError(`${command.path} timed out after ${timeoutMs}ms`, {
              code: 'timeout',
            }),
          ),
        timeoutMs,
      )
    })
    try {
      return await Promise.race([command.action?.(...args), timedOut])
    } finally {
      clearTimeout(timer)
    }
  }

  static #timeoutFor(command: Command) {
    for (let current: Command | undefined = command; current; ) {
      if (current.#timeoutMs !== undefined) return current.#timeoutMs
      current = current.parent
    }
  }

  // A command that declares nothing forwards context.argv as is; anything declared makes typos fail
  static #isStrict(command: Command) {
    return command.arguments.length > 0 || command.effectiveOptions.length > 0
  }

  // Structured apps print JSON when asked with --json, and whenever stdout is not a terminal
  static #isJsonOutput(command: Command, argv: string[]) {
    if (!command.root.#isStructured) return false
    const end = argv.indexOf('--')
    const flags = end === -1 ? argv : argv.slice(0, end)
    return flags.includes('--json') || !process.stdout.isTTY
  }

  static #printHelp(command: Command, argv: string[]) {
    if (argv.includes('--json')) {
      console.log(JSON.stringify(command.describe()))
      return
    }
    console.log(command.helpText())
  }

  // Usage mistakes go to stderr so stdout stays parseable, and exit 2 to tell them apart from failures
  static #exitWithUsage(
    command: Command,
    argv: string[],
    error: { code: string; message: string },
  ) {
    if (Command.#isJsonOutput(command, argv)) {
      printError(
        {
          ...error,
          data: { usage: command.usage, help: `${command.path} -h` },
        },
        { json: true },
      )
    } else {
      console.error(
        `${error.message}\n\nUsage: ${command.usage}\nRun '${command.path} -h' for help.`,
      )
    }
    return process.exit(USAGE_EXIT_CODE)
  }

  // Flags before the command name that belong to a visible global option, with their values
  #takeLeadingGlobals(argv: string[]) {
    const globals = this.visibleGlobalOptions
    let index = 0
    while (index < argv.length) {
      const token = argv[index]
      if (!token.startsWith('-') || token === '--') break
      const [flag] = token.split('=')
      const option = findOption(flag, globals)
      if (!option) break
      index++
      if (token.includes('=') || option.isBoolean() || option.negate) continue
      const next = argv[index]
      if (next === undefined) continue
      const isCommandName = this.#findCommand(next) !== undefined
      if (option.required || (!next.startsWith('-') && !isCommandName)) {
        index++
      }
    }
    return { leadingGlobals: argv.slice(0, index), argv: argv.slice(index) }
  }

  #appendArgsAndOptions(lines: string[], source: Command) {
    if (source.arguments.length > 0) {
      lines.push('')
      lines.push('Arguments:')
      const maxLen = Math.max(...source.arguments.map((a) => a.rawName.length))
      const indent = ' '.repeat(maxLen + 4)
      for (const arg of source.arguments) {
        const values =
          typeof arg.completion === 'function'
            ? arg.completion()
            : arg.completion
        const defaultText =
          arg.defaultText ??
          (arg.defaultValue === undefined
            ? undefined
            : String(arg.defaultValue))
        const detail = [
          defaultText && `default: ${defaultText}`,
          values.length > 0 && `choices: ${values.join(', ')}`,
        ].filter(Boolean) as string[]
        const [first = '', ...rest] = [arg.description, ...detail].filter(
          Boolean,
        )
        lines.push(`  ${arg.rawName.padEnd(maxLen + 2)}${first}`.trimEnd())
        for (const line of rest) lines.push(`${indent}${line}`)
      }
    }
    Command.#appendOptions(lines, 'Options', source.options)
  }

  static #appendOptions(lines: string[], title: string, options: Option[]) {
    if (options.length === 0) return
    lines.push('')
    lines.push(`${title}:`)
    const flags = options.map(String)
    const maxLen = Math.max(...flags.map((f) => f.length))
    for (let i = 0; i < options.length; i++) {
      const padded = flags[i].padEnd(maxLen + 2)
      const choices = Command.#choicesText(options[i].completion)
      const desc = [options[i].description, choices].filter(Boolean).join(' ')
      lines.push(`  ${padded}${desc}`)
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
    registeredOptions: Option[],
    options: Record<string, any>,
  ): string | null {
    for (const opt of registeredOptions) {
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
      const keys = staticChoices(arg.completion)
      if (!keys) continue
      const values = arg.variadic ? value : [value]
      for (const v of values) {
        if (!keys.includes(String(v))) {
          return `Invalid value for ${arg.name}: '${v}' (expected: ${keys.join(', ')})`
        }
      }
    }
    return null
  }

  static #validateOptionChoices(
    registeredOptions: Option[],
    options: Record<string, any>,
  ): string | null {
    for (const opt of registeredOptions) {
      const value = options[opt.attributeName]
      if (value == null || typeof value === 'boolean') continue
      const keys = staticChoices(opt.completion)
      if (!keys) continue
      for (const v of Array.isArray(value) ? value : [value]) {
        if (!keys.includes(String(v))) {
          return `Invalid value for ${opt.long ?? opt.short}: '${v}' (expected: ${keys.join(', ')})`
        }
      }
    }
    return null
  }

  // add(name, description?, completionOrDefault?) and add(name, completionOrDefault)
  static #normalizeAddArgs(args: any[]) {
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

    return {
      name: inputName.trim() as string,
      description,
      completionOrDefault,
    }
  }

  static #choicesText(completion: string[] | (() => string[])): string {
    const values = typeof completion === 'function' ? completion() : completion
    if (values.length === 0) return ''
    const text = values.join(', ')
    if (text.length <= 40) return `(${text})`
    return `(${text.slice(0, 37)}...)`
  }

  // Only lists direct children: walking the whole tree prints too many commands to read.
  // Run `<parent> -h` to see a group's subcommands.
  #collectCommands(): CommandHelpEntry[] {
    const result: CommandHelpEntry[] = []
    for (const c of this.commands) {
      if (c.hidden) continue
      const isGroup = c.commands.length > 0
      if (!c.description && !c.action && !isGroup) continue
      const args = c.#argsText()
      let label = args ? `${c._name} ${args}` : (c._name as string)
      if (isGroup && !c.action) label = `${label} <command>`
      result.push({
        type: 'command',
        label,
        // Aliases live in the description to keep the name column narrow
        description: [...c.aliases, c.description].filter(Boolean).join(', '),
        order: c.#order,
      })
    }
    return result
  }

  #findCommand(name: string) {
    return (
      this.commands.find(
        (command) => command._name === name || command.aliases.includes(name),
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

export const app = new Command<[], NoOptions>()

export function runAppBeforeExit() {
  return app.run()
}

export type Mixin = (command: Command) => unknown

type HelpEntry = CommandHelpEntry | SectionHelpEntry

type CommandHelpEntry = {
  type: 'command'
  label: string
  description: string
  order: number
}

type SectionHelpEntry = {
  type: 'section'
  name: string
  order: number
}
