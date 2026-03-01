export class Argument {
  rawName: string
  name: string
  description: string
  required: boolean
  variadic: boolean
  completion: string[] | (() => string[])
  defaultValue: any

  constructor(
    rawName: string,
    description = '',
    completion: string[] | (() => string[]) = [],
  ) {
    this.rawName = rawName.trim()
    const { name, required, variadic, defaultValue } =
      Argument.parseName(rawName)
    this.name = name
    this.required = required
    this.variadic = variadic
    this.description = description
    this.completion = completion
    this.defaultValue = defaultValue
  }

  toString() {
    return this.rawName
  }

  static parseName(rawName: string) {
    const trimmed = rawName.trim()
    const required = trimmed.startsWith('<')
    const variadic = trimmed.includes('...')
    const inner = trimmed.replace(/[<>[\].]/g, '').trim()
    const eqIndex = inner.indexOf('=')
    const name = eqIndex !== -1 ? inner.slice(0, eqIndex) : inner
    const defaultValue = eqIndex !== -1 ? inner.slice(eqIndex + 1) : undefined
    return { name, required, variadic, defaultValue }
  }
}
