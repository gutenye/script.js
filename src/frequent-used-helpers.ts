export function exitWithError(message: string, help?: string) {
  console.error(`Error: ${message}`)
  if (help) console.log(`\n${help}`)
  process.exit(1)
}
