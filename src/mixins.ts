import os from 'node:os'

export async function mixins(...names: string[]) {
  const dir = `${os.homedir()}/bin.src/mixins`
  const notFound: string[] = []
  for (const name of names) {
    try {
      await import(`${dir}/${name}`)
    } catch (error: any) {
      if (error.message?.includes('Cannot find module')) {
        notFound.push(name)
      } else {
        throw error
      }
    }
  }
  if (notFound.length > 0) {
    console.error(`Error: [mixins] not found: ${notFound.join(', ')}`)
    process.exit(1)
  }
}
