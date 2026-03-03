import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as yaml from 'yaml'
import type { Command } from './Command'
import { getAkeSuffix, getCompletionName } from './ake/shared'

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
  const spec: CarapaceSpec = { name: command.name as string }

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

export function buildSpecText(
  command: Command,
): { spec: CarapaceSpec; text: string } | undefined {
  if (!command.name) return undefined

  const spec = buildSpec(command)
  if (!(spec.commands || spec.flags || spec.completion)) return undefined

  const text = yaml.stringify(spec)
  return { spec, text }
}

function getCarapaceSpecsDir(): string {
  const homeDir = os.homedir()
  switch (os.platform()) {
    case 'darwin':
      return path.join(homeDir, 'Library/Application Support/carapace/specs')
    case 'win32': {
      const localAppData =
        process.env.LOCALAPPDATA || path.join(homeDir, 'AppData/Local')
      return path.join(localAppData, 'carapace/specs')
    }
    default: {
      const configHome =
        process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config')
      return path.join(configHome, 'carapace/specs')
    }
  }
}

type InstallOptions = {
  scriptPath?: string
  specsDir?: string
}

export async function installCompletion(
  command: Command,
  options: InstallOptions = {},
) {
  try {
    if (!command.name && options.scriptPath) {
      const suffix = getAkeSuffix(path.basename(options.scriptPath))
      if (suffix !== null) {
        command.name = getCompletionName(suffix)
      }
    }

    const result = buildSpecText(command)
    if (!result) return

    const specsDir = options.specsDir || getCarapaceSpecsDir()
    const filePath = path.join(specsDir, `${result.spec.name}.yaml`)

    let existing: string | undefined
    try {
      existing = fsSync.readFileSync(filePath, 'utf8')
    } catch {}

    if (existing === result.text) return

    fsSync.mkdirSync(specsDir, { recursive: true })
    fsSync.writeFileSync(filePath, result.text)
    console.log(`Updated completion spec: ${filePath}`)
  } catch {
    // completion is supplementary — silently ignore errors
  }
}
