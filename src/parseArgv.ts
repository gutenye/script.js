import type { Argument } from './Argument'
import type { Option } from './Option'

export type Options<T = Record<string, any>> = T & {
  $has(key: string): boolean
}

export function parseArgv(
  argv: string[],
  registeredArgs: Argument[],
  registeredOptions: Option[],
): { positionals: any[]; options: Record<string, any> } {
  const options: Record<string, any> = {}
  const provided = new Set<string>()
  const rawPositionals: string[] = []

  for (const opt of registeredOptions) {
    if (opt.negate) {
      options[opt.attributeName] = true
    } else if (opt.defaultValue !== undefined) {
      options[opt.attributeName] = opt.defaultValue
    }
  }

  let i = 0
  let optionsParsing = true

  while (i < argv.length) {
    const token = argv[i]

    if (token === '--') {
      optionsParsing = false
      i++
      continue
    }

    if (optionsParsing && token.startsWith('-') && token.length > 1) {
      let flag = token
      let inlineValue: string | undefined
      const eqIndex = token.indexOf('=')
      if (eqIndex !== -1) {
        flag = token.slice(0, eqIndex)
        inlineValue = token.slice(eqIndex + 1)
      }

      const opt = findOption(flag, registeredOptions)
      if (opt) {
        provided.add(opt.attributeName)
        if (opt.negate) {
          options[opt.attributeName] = false
        } else if (opt.required) {
          const value = inlineValue ?? argv[++i]
          options[opt.attributeName] = value
        } else if (opt.optional) {
          if (inlineValue !== undefined) {
            options[opt.attributeName] = inlineValue
          } else {
            const next = argv[i + 1]
            if (next !== undefined && !next.startsWith('-')) {
              options[opt.attributeName] = next
              i++
            } else {
              options[opt.attributeName] = opt.defaultValue ?? true
            }
          }
        } else {
          options[opt.attributeName] = true
        }
      }
    } else {
      rawPositionals.push(token)
    }

    i++
  }

  options.$has = (key: string) => provided.has(key)

  const positionals: any[] = []
  let posIdx = 0
  for (const arg of registeredArgs) {
    if (arg.variadic) {
      positionals.push(rawPositionals.slice(posIdx))
      posIdx = rawPositionals.length
    } else {
      positionals.push(rawPositionals[posIdx] ?? arg.defaultValue)
      posIdx++
    }
  }

  return { positionals, options }
}

function findOption(flag: string, options: Option[]): Option | undefined {
  return options.find((o) => o.short === flag || o.long === flag)
}
