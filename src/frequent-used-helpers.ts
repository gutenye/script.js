export function exitWithError(message: string, help?: string) {
  console.error(`\nError: ${message}`)
  if (help) console.log(`\n${help}`)
  process.exit(1)
}
