// exitError(message, [more])
export function exitError(message, more) {
  echo(colors.red.bold(`\nError: ${message}`))
  if (more) {
    echo(`\n${more}`)
  }
  process.exit(1)
}
