export function exitWithError(message: string, help?: string): never {
  console.error(`\nError: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(1)
}
