import type { Argument } from './Argument'
import type { Command } from './Command'
import type { Option } from './Option'

// Machine-readable command tree, printed by `--help --json` and turned into MCP tools

export type ArgumentDescription = {
  name: string
  description: string
  required: boolean
  variadic: boolean
  type: 'string' | 'number' | 'json'
  default?: unknown
  choices?: string[]
}

export type OptionDescription = {
  name: string
  flags: string
  short?: string
  long?: string
  description: string
  // none: a boolean flag; required: --x <v>; optional: --x [v], true when given without a value
  value: 'none' | 'required' | 'optional'
  variadic: boolean
  negate: boolean
  global: boolean
  type: 'string' | 'number' | 'json'
  default?: unknown
  choices?: string[]
}

export type CommandDescription = {
  name: string
  path: string
  aliases: string[]
  description: string
  usage: string
  // Declares nothing, so it forwards its argv to whatever it wraps
  passThrough: boolean
  runnable: boolean
  arguments: ArgumentDescription[]
  options: OptionDescription[]
  examples: { command: string; description: string }[]
  commands: CommandDescription[]
}

export function describeCommand(command: Command): CommandDescription {
  const inherited = new Set(command.inheritedOptions)
  return {
    name: command._name ?? '',
    path: command.path,
    aliases: command.aliases,
    description: command.description ?? '',
    usage: command.usage,
    passThrough:
      command.arguments.length === 0 && command.effectiveOptions.length === 0,
    runnable: command.action !== undefined,
    arguments: command.arguments.map(describeArgument),
    options: command.effectiveOptions.map((option) =>
      describeOption(option, inherited.has(option)),
    ),
    examples: command.examples,
    commands: command.commands
      .filter((child) => !child.hidden)
      .map(describeCommand),
  }
}

function describeArgument(argument: Argument): ArgumentDescription {
  return withOptionalFields(
    {
      name: argument.name,
      description: argument.description,
      required: argument.required,
      variadic: argument.variadic,
      type: argument.valueType ?? 'string',
    },
    argument.defaultValue,
    staticChoices(argument.completion),
  )
}

function describeOption(option: Option, global: boolean): OptionDescription {
  return withOptionalFields(
    {
      name: option.attributeName,
      flags: option.rawFlags,
      ...(option.short ? { short: option.short } : {}),
      ...(option.long ? { long: option.long } : {}),
      description: option.description,
      value: optionValueKind(option),
      variadic: option.variadic,
      negate: option.negate,
      global,
      type: option.valueType ?? 'string',
    },
    option.negate ? true : option.defaultValue,
    staticChoices(option.completion),
  )
}

export function optionValueKind(option: Option) {
  if (option.required) return 'required'
  if (option.optional) return 'optional'
  return 'none'
}

// Fixed choices a value must match; undefined when completion is dynamic or a Carapace macro
export function staticChoices(completion: string[] | (() => string[])) {
  if (typeof completion === 'function') return
  if (completion.length === 0) return
  if (completion.some((c) => c.startsWith('$') || /^[<[]/.test(c))) return
  // Extract keys from "key\tdescription" format for validation
  return completion.map((c) => c.split('\t')[0])
}

function withOptionalFields<T extends object>(
  description: T,
  defaultValue: unknown,
  choices: string[] | undefined,
) {
  return {
    ...description,
    ...(defaultValue === undefined ? {} : { default: defaultValue }),
    ...(choices ? { choices } : {}),
  }
}
