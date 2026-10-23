import { convertValue, splitValueType, type ValueType } from './valueType'

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
  inlineDefaultValue?: any
  valueType?: ValueType

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

    // '[ms:number=10000]' → type 'number', inline default 10000
    const placeholderMatch = rawFlags.match(/[<[]([^>\]]*)[>\]]/)
    if (placeholderMatch) {
      const [placeholder, inlineDefault] = splitOnce(
        placeholderMatch[1].replace(/\.\.\./g, ''),
        '=',
      )
      this.valueType = splitValueType(placeholder.trim()).valueType
      if (inlineDefault !== undefined && placeholderMatch[0][0] === '[') {
        this.inlineDefaultValue = convertValue(
          inlineDefault,
          this.valueType,
          rawFlags,
        )
      }
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

  convert(value: string) {
    return convertValue(value, this.valueType, this.long ?? this.short ?? '')
  }

  // Two options clash when they share a flag or an attribute name
  overlaps(other: Option) {
    return (
      this.attributeName === other.attributeName ||
      (this.short !== undefined && this.short === other.short) ||
      (this.long !== undefined && this.long === other.long)
    )
  }
}

function splitOnce(text: string, separator: string): [string, string?] {
  const index = text.indexOf(separator)
  if (index === -1) return [text]
  return [text.slice(0, index), text.slice(index + 1)]
}
