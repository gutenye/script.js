import { convertValue, splitValueType, type ValueType } from './valueType'

export class Argument {
  rawName: string
  name: string
  description: string
  required: boolean
  variadic: boolean
  completion: string[] | (() => string[])
  defaultValue: any
  valueType?: ValueType

  constructor(
    rawName: string,
    description = '',
    completion: string[] | (() => string[]) = [],
  ) {
    this.rawName = rawName.trim()
    const { name, required, variadic, defaultValue, valueType } =
      Argument.parseName(rawName)
    this.name = name
    this.required = required
    this.variadic = variadic
    this.description = description
    this.completion = completion
    this.valueType = valueType
    this.defaultValue =
      defaultValue === undefined
        ? undefined
        : convertValue(defaultValue, valueType, this.rawName)
  }

  convert(value: string) {
    return convertValue(value, this.valueType, this.rawName)
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
    const placeholder = eqIndex !== -1 ? inner.slice(0, eqIndex) : inner
    const defaultValue = eqIndex !== -1 ? inner.slice(eqIndex + 1) : undefined
    const { name, valueType } = splitValueType(placeholder)
    return { name, required, variadic, defaultValue, valueType }
  }
}
