import os from 'node:os'
import fs from '../utils/fs'

const HOME = os.homedir()
const CWD = process.cwd()

export const STORAGE_DIR = `${HOME}/bin.src/ake.v2`
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
  const name = CWD.replaceAll('/', '_')
  return `${STORAGE_DIR}/${name}`
}

// TODO: remove this function
async function pathExists(path: string) {
  try {
    await fs.access(path)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

export function exitWithError(message: string, help?: string): never {
  console.error(`Error: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(1)
}
