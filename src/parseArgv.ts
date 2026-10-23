import type { Argument } from './Argument'
import type { Option } from './Option'
import { UsageError } from './UsageError'

export type Options<T = Record<string, any>> = T & {
  $has(key: string): boolean
}

type ParseArgvSettings = {
  // Unknown options and extra positionals fail instead of being left for context.argv
  strict?: boolean
}

export function parseArgv(
  argv: string[],
  registeredArgs: Argument[],
  registeredOptions: Option[],
  { strict = false }: ParseArgvSettings = {},
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

  const tokens = expandShortFlags(argv, registeredOptions)
  let i = 0
  let optionsParsing = true

  while (i < tokens.length) {
    const token = tokens[i]

    if (optionsParsing && token === '--') {
      optionsParsing = false
      i++
      continue
    }

    if (optionsParsing && isFlag(token, registeredOptions)) {
      let flag = token
      let inlineValue: string | undefined
      const eqIndex = token.indexOf('=')
      if (eqIndex !== -1) {
        flag = token.slice(0, eqIndex)
        inlineValue = token.slice(eqIndex + 1)
      }

      const opt = findOption(flag, registeredOptions)
      if (!opt) {
        if (strict) {
          throw new UsageError(unknownOptionMessage(flag, registeredOptions))
        }
        i++
        continue
      }

      const name = opt.attributeName
      const isRepeated = provided.has(name)
      provided.add(name)
      if (opt.negate) {
        options[name] = false
      } else if (opt.variadic) {
        const values = inlineValue === undefined ? [] : [inlineValue]
        while (
          inlineValue === undefined &&
          i + 1 < tokens.length &&
          !isFlag(tokens[i + 1], registeredOptions)
        ) {
          values.push(tokens[++i])
        }
        // Repeating a variadic option appends: -a 1 -a 2 → [1, 2]
        const previous = isRepeated ? options[name] : []
        const collected = [...previous, ...values.map((v) => opt.convert(v))]
        options[name] =
          collected.length === 0 && opt.required ? undefined : collected
      } else if (opt.required) {
        const value = inlineValue ?? tokens[++i]
        options[name] = value === undefined ? undefined : opt.convert(value)
      } else if (opt.optional) {
        if (inlineValue !== undefined) {
          options[name] = opt.convert(inlineValue)
        } else {
          const next = tokens[i + 1]
          if (next !== undefined && !isFlag(next, registeredOptions)) {
            options[name] = opt.convert(next)
            i++
          } else {
            options[name] = opt.defaultValue ?? true
          }
        }
      } else {
        if (inlineValue !== undefined && strict) {
          throw new UsageError(`Option ${flag} does not take a value`)
        }
        options[name] = true
      }
    } else {
      rawPositionals.push(token)
    }

    i++
  }

  options.$has = (key: string) => provided.has(key)

  const hasVariadic = registeredArgs.some((arg) => arg.variadic)
  if (strict && !hasVariadic && rawPositionals.length > registeredArgs.length) {
    throw new UsageError(
      `Unexpected argument: ${rawPositionals[registeredArgs.length]}`,
    )
  }

  const positionals: any[] = []
  let posIdx = 0
  for (const arg of registeredArgs) {
    if (arg.variadic) {
      positionals.push(
        rawPositionals.slice(posIdx).map((value) => arg.convert(value)),
      )
      posIdx = rawPositionals.length
    } else {
      const value = rawPositionals[posIdx]
      positionals.push(
        value === undefined ? arg.defaultValue : arg.convert(value),
      )
      posIdx++
    }
  }

  return { positionals, options }
}

// Stops at the first `--`, like option parsing does
export function wantsHelp(argv: string[]) {
  const end = argv.indexOf('--')
  const flags = end === -1 ? argv : argv.slice(0, end)
  return flags.includes('-h') || flags.includes('--help')
}

export function findOption(
  flag: string,
  options: Option[],
): Option | undefined {
  return options.find((o) => o.short === flag || o.long === flag)
}

// A negative number such as -5 is a value unless an option claims that flag
function isFlag(token: string, options: Option[]) {
  if (!token.startsWith('-') || token.length === 1) return false
  if (/^-\d/.test(token)) return findOption(token, options) !== undefined
  return true
}

// -nv → -n -v, when every letter is a registered short flag and only the last one takes a value
function expandShortFlags(argv: string[], options: Option[]) {
  const end = argv.indexOf('--')
  return argv.flatMap((token, index) => {
    if (end !== -1 && index >= end) return [token]
    if (!/^-[a-zA-Z]{2,}$/.test(token)) return [token]
    if (findOption(token, options)) return [token]
    const flags = token
      .slice(1)
      .split('')
      .map((letter) => `-${letter}`)
    const matched = flags.map((flag) => findOption(flag, options))
    const isExpandable = matched.every(
      (opt, position) =>
        opt !== undefined &&
        (position === flags.length - 1 || opt.isBoolean() || opt.negate),
    )
    return isExpandable ? flags : [token]
  })
}

function unknownOptionMessage(flag: string, options: Option[]) {
  const candidates = options.flatMap((o) =>
    [o.long, o.short].filter((name): name is string => name !== undefined),
  )
  const suggestion = closestMatch(flag, candidates)
  return suggestion
    ? `Unknown option: ${flag} (did you mean ${suggestion}?)`
    : `Unknown option: ${flag}`
}

function closestMatch(input: string, candidates: string[]) {
  let best: string | undefined
  let bestDistance = Math.max(2, Math.floor(input.length / 3)) + 1
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function editDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let row = 1; row <= a.length; row++) {
    const current = [row]
    for (let column = 1; column <= b.length; column++) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + cost,
      )
    }
    previous = current
  }
  return previous[b.length]
}
