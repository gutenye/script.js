// Pretty-prints a value as JSON on stdout, for scripts whose output other tools parse
export function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}
