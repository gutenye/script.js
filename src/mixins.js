export async function mixins(...names) {
  const errorNames = []
  for (const name of names) {
    try {
      // TODO: use env to config
      await import(`${process.env.HOME}/bin.src/mixins/${name}`)
    } catch (error) {
      if (error.message.match(/Cannot find module/)) {
        errorNames.push(name)
      } else {
        throw error
      }
    }
  }
  if (errorNames.length > 0) {
    console.error(`Error: [mixins] not found: ${errorNames.join(', ')}`)
    process.exit(1)
  }
}
