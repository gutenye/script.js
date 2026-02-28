export class Argument {
  name: string
  description: string
  required: boolean
  variadic: boolean
  completion: string[]
  defaultValue: any

  constructor(rawName: string, description = '', completion: string[] = []) {
    const { name, required, variadic } = Argument.parseName(rawName)
    this.name = name
    this.required = required
    this.variadic = variadic
    this.description = description
    this.completion = completion
    this.defaultValue = undefined
  }

  static parseName(rawName: string) {
    const trimmed = rawName.trim()
    const required = trimmed.startsWith('<')
    const variadic = trimmed.includes('...')
    const name = trimmed.replace(/[<>\[\]\.]/g, '').trim()
    return { name, required, variadic }
  }
}
