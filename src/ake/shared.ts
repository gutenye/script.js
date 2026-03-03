import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import fs from '../utils/fs'

const HOME = os.homedir()
const CWD = process.cwd()

export const STORAGE_DIR = `${HOME}/bin.src/ake`
export const TEMPLATE_NAME = 'template'

export function getAkeFilenames(suffix = ''): string[] {
  const name = `ake${suffix}`
  return [name, `${name}.ts`]
}

export function getAkeSuffix(name: string): string | null {
  const base = name.replace(/\.ts$/, '')
  if (!base.startsWith('ake') || base === 'akectl') return null
  return base.slice(3)
}

export function getSuffix(): string {
  return getAkeSuffix(path.basename(process.argv[1])) ?? ''
}

export async function findAkeFiles(suffix = ''): Promise<string[]> {
  const filenames = getAkeFilenames(suffix)
  const localDir = CWD
  const remoteDir = getRemoteDir()
  const dirsToCheck = [localDir, remoteDir]

  const akeFiles = await Promise.all(
    dirsToCheck.flatMap((dir) =>
      filenames.map(async (name) => {
        const akeFile = `${dir}/${name}`
        return (await fs.pathExists(akeFile)) ? akeFile : null
      }),
    ),
  )

  return akeFiles.filter(Boolean) as string[]
}

export function getRemoteDir() {
  return `${STORAGE_DIR}/${getUniqueName()}`
}

export function getCompletionName(suffix = '') {
  return `ake${suffix}.${getUniqueName()}`
}

export function getUniqueName() {
  // use sync method to avoid using await in app.enableAkeCompletion()
  return fsSync.realpathSync(CWD).replaceAll('/', '_')
}

export function exitWithError(message: string, help?: string): never {
  console.error(`Error: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(1)
}
