export function exitWithError(message: string, help?: string, code = 1): never {
  console.error(`\nError: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(code)
}
