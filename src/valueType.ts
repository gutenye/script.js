import { UsageError } from './UsageError'

const VALUE_TYPES = ['number', 'json'] as const

export type ValueType = (typeof VALUE_TYPES)[number]

// 'ms:number' → { name: 'ms', valueType: 'number' }
export function splitValueType(placeholder: string): {
  name: string
  valueType?: ValueType
} {
  const separator = placeholder.indexOf(':')
  if (separator === -1) return { name: placeholder }
  const name = placeholder.slice(0, separator)
  const valueType = placeholder.slice(separator + 1)
  if (!isValueType(valueType)) {
    throw new Error(
      `Unknown value type '${valueType}' in '${placeholder}' (expected: ${VALUE_TYPES.join(', ')})`,
    )
  }
  return { name, valueType }
}

export function convertValue(
  value: string,
  valueType: ValueType | undefined,
  label: string,
) {
  if (valueType === 'number') {
    const number = Number(value)
    if (value.trim() === '' || Number.isNaN(number)) {
      throw new UsageError(`Invalid number for ${label}: '${value}'`)
    }
    return number
  }
  if (valueType === 'json') {
    try {
      return JSON.parse(value)
    } catch (error) {
      throw new UsageError(
        `Invalid JSON for ${label}: ${(error as Error).message}`,
      )
    }
  }
  return value
}

function isValueType(value: string): value is ValueType {
  return (VALUE_TYPES as readonly string[]).includes(value)
}
