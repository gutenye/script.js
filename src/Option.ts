export class Option {
  rawFlags: string
  short?: string
  long?: string
  description: string
  required: boolean
  optional: boolean
  variadic: boolean
  negate: boolean
  attributeName: string
  completion: string[] | (() => string[])
  defaultValue: any
  inlineDefaultValue?: string

  constructor(
    rawFlags: string,
    description = '',
    defaultValueOrCompletion: any = undefined,
  ) {
    this.rawFlags = rawFlags
    this.description = description

    const parts = rawFlags.split(',').map((s) => s.trim())
    for (const part of parts) {
      if (part.startsWith('--')) {
        this.long = part.split(/\s/)[0]
      } else if (part.startsWith('-')) {
        const token = part.split(/\s/)[0]
        if (token.startsWith('--')) {
          this.long = token
        } else {
          this.short = token
        }
      }
    }

    this.required = rawFlags.includes('<')
    this.optional = rawFlags.includes('[')
    this.variadic = rawFlags.includes('...')
    this.negate = this.long?.startsWith('--no-') ?? false

    const inlineDefaultMatch = rawFlags.match(/\[[\w.]+=(.*?)\]/)
    if (inlineDefaultMatch) {
      this.inlineDefaultValue = inlineDefaultMatch[1]
    }

    if (this.long) {
      let key = this.long.replace(/^--/, '')
      if (this.negate) key = key.replace(/^no-/, '')
      this.attributeName = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    } else if (this.short) {
      this.attributeName = this.short.replace(/^-/, '')
    } else {
      this.attributeName = ''
    }

    if (
      Array.isArray(defaultValueOrCompletion) ||
      typeof defaultValueOrCompletion === 'function'
    ) {
      this.completion = defaultValueOrCompletion
      this.defaultValue = this.inlineDefaultValue
    } else {
      this.completion = []
      this.defaultValue = defaultValueOrCompletion ?? this.inlineDefaultValue
    }
  }

  toString() {
    return this.rawFlags
  }

  isBoolean() {
    return !this.required && !this.optional && !this.negate
  }
}
