import os from 'node:os'
import fs from '../utils/fs'

const HOME = os.homedir()
const CWD = process.cwd()

export const STORAGE_DIR = `${HOME}/bin.src/ake`
export const TEMPLATE_NAME = 'template'

export async function findAkeFiles(): Promise<string[]> {
  const localDir = CWD
  const remoteDir = getRemoteDir()
  const dirsToCheck = [localDir, remoteDir]

  const akeFiles = await Promise.all(
    dirsToCheck.map(async (dir) => {
      const akeFile = `${dir}/ake`
      return (await fs.pathExists(akeFile)) ? akeFile : null
    }),
  )

  return akeFiles.filter(Boolean) as string[]
}

export function getRemoteDir() {
  return `${STORAGE_DIR}/${getUniqueName()}`
}

export function getCompletionName() {
  return `ake.${getUniqueName()}`
}

export function getUniqueName() {
  return CWD.replaceAll('/', '_')
}

export function exitWithError(message: string, help?: string): never {
  console.error(`Error: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(1)
}
