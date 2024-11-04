import fs from 'node:fs/promises'
import os from 'node:os'
import { Command as BaseCommand } from 'commander'
import { mergeWith } from 'lodash-es'
import * as yaml from 'yaml'
import { fsUtils } from './utils/index.js'

export * from 'commander'

export class Command extends BaseCommand {
  complete(options) {
    this.complete = options
    return this
  }

  // overrides
  createCommand(name) {
    return new Command(name)
  }
}

export const program = new Command()

const SPECS_PATH = `${os.homedir()}/Library/Application Support/carapace/specs`

export async function installCompletion() {
  const spec = buildSpec(program)
  const text = yaml.stringify(spec)
  const path = `${SPECS_PATH}/${spec.name}.yaml`

  const content = await fsUtils.readFileSafe(path, 'utf8')
  if (content) {
    if (content === text) {
      return
    }
    const answer = await question(`Overwrite completion file '${path}'? [y/n] `)
    const newAnswer = answer.trim().toLowerCase()
    if (newAnswer !== 'y') {
      return
    }
  }

  await fs.writeFile(path, text)
  console.log(`\nCompletion file is installed to '${path}'\n`)
}

// I'm recursive
export function buildSpec(command) {
  if (command._hidden) {
    return
  }

  if (!command._name) {
    throw new Error(
      '[completion.buildSpec] command name is missing, use program.name() to define it',
    )
  }

  const spec = {
    name: command._name,
  }

  if (command._description) {
    spec.description = command._description
  }

  if (command._aliases.length > 0) {
    spec.aliases = command._aliases
  }

  const completion = {}
  const positional = []
  for (const [index, argument] of command.registeredArguments.entries()) {
    positional.push(argument.argChoices || [])
  }
  if (positional.some((v) => v.length > 0)) {
    completion.positional = positional
  }

  for (const option of command.options) {
    spec.flags = spec.flags || {}
    let flags = [option.short, option.long].filter(Boolean).join(', ')
    if (!option.isBoolean) {
      flags += '='
    }
    if (option.required) {
      flags += '=!'
    }
    if (option.optional) {
      flags += '=?'
    }
    spec.flags[flags] = option.description
    if (option.argChoices) {
      completion.flags = completion.flags || {}
      completion.flags[option.name()] = option.argChoices
    }
  }

  if (Object.keys(completion).length > 0) {
    spec.completion = completion
  }

  if (command.complete) {
    mergeWith(spec, command.complete, (objValue, srcValue, key) => {
      if (srcValue === null) {
        return objValue
      }
    })
  }

  for (const subcommand of command.commands) {
    const newSpec = buildSpec(subcommand)
    if (newSpec) {
      spec.commands = spec.commands || []
      spec.commands.push(newSpec)
    }
  }

  return spec
}
