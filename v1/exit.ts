// exitWithError(message, [more])
export function exitWithError(message, more) {
  // for comletion <Tab> display error message: 1) no prefix: '\n, it uses first line 2) use console.error
  let text = colors.red.bold(`Error: ${message}`)
  if (more) {
    text += `\n${more}`
  }
  console.error(text)
  process.exit(1)
}
