export class Option {
  name: string
  description: string
  completion: string[]

  constructor(name: string, description = '', completion: string[] = []) {
    this.name = name
    this.description = description
    this.completion = completion
  }
}
