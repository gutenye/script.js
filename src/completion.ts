import type { Command } from './Command'

export type CompletionValue = string[] | (() => string[])

export type CarapaceSpec = {
  name: string
  aliases?: string[]
  description?: string
  flags?: Record<string, string>
  completion?: CarapaceCompletion
  commands?: CarapaceSpec[]
}

export type CarapaceCompletion = {
  positional?: string[][]
  positionalany?: string[]
  flag?: Record<string, string[]>
}

function resolveCompletion(completion: CompletionValue): string[] {
  if (typeof completion === 'function') {
    try {
      return completion()
    } catch {
      return []
    }
  }
  return completion
}

export function buildSpec(command: Command): CarapaceSpec {
  const spec: CarapaceSpec = { name: command.name! }

  if (command.description) {
    spec.description = command.description
  }
  if (command.aliases.length > 0) {
    spec.aliases = command.aliases
  }

  const completion: CarapaceCompletion = {}

  for (const arg of command.arguments) {
    const values = resolveCompletion(arg.completion)
    if (arg.variadic) {
      if (values.length > 0) {
        completion.positionalany = values
      }
    } else {
      completion.positional = completion.positional || []
      completion.positional.push(values)
    }
  }

  for (const opt of command.options) {
    spec.flags = spec.flags || {}
    let flag = [opt.short, opt.long].filter(Boolean).join(', ')
    if (opt.required) flag += '='
    else if (opt.optional) flag += '=?'
    spec.flags[flag] = opt.description

    const values = resolveCompletion(opt.completion)
    if (values.length > 0) {
      completion.flag = completion.flag || {}
      const key = opt.long?.replace(/^--/, '') || opt.attributeName
      completion.flag[key] = values
    }
  }

  if (Object.keys(completion).length > 0) {
    spec.completion = completion
  }

  for (const sub of command.commands) {
    spec.commands = spec.commands || []
    spec.commands.push(buildSpec(sub))
  }

  return spec
}
