import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import fs, { realpathSyncSafe } from '../utils/fs'

const HOME = os.homedir()
const CWD = process.cwd()

// ~/bin.src/ake may not exist (e.g. in CI), so fall back to the raw path
export const REMOTE_DIR = realpathSyncSafe(`${HOME}/bin.src/ake`)
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

export function isAke(scriptPath: string): boolean {
  return getAkeSuffix(path.basename(scriptPath)) !== null
}

export function getSuffix(): string {
  return getAkeSuffix(path.basename(process.argv[1])) ?? ''
}

export function getProjectDir(scriptPath: string): string {
  const dir = path.dirname(path.resolve(scriptPath))
  if (dir.startsWith(REMOTE_DIR)) {
    const uniqueName = path.basename(dir)
    return uniqueName.replaceAll('_', '/')
  }
  return dir
}

export async function findAkeFiles(
  suffix = '',
  startDir?: string,
): Promise<string[]> {
  const filenames = getAkeFilenames(suffix)
  let localDir = fsSync.realpathSync(startDir ?? process.cwd())
  while (true) {
    const dirsToCheck = [localDir, getRemoteDirFor(localDir)]
    const found: string[] = []
    for (const d of dirsToCheck) {
      for (const name of filenames) {
        const akeFile = `${d}/${name}`
        if (await fs.pathExists(akeFile)) found.push(akeFile)
      }
    }
    if (found.length > 0) return found
    const parent = path.dirname(localDir)
    if (parent === localDir) break
    localDir = parent
  }
  return []
}

// use sync method to avoid using await in app.enableAkeCompletion()
export function getRemoteDirFor(dir: string): string {
  const uniqueName = fsSync.realpathSync(dir).replaceAll('/', '_')
  return `${REMOTE_DIR}/${uniqueName}`
}

export function getRemoteDir() {
  return getRemoteDirFor(CWD)
}

export function getCompletionName(suffix = '') {
  const uniqueName = fsSync.realpathSync(CWD).replaceAll('/', '_')
  return `ake${suffix}.${uniqueName}`
}

export function exitWithError(message: string, help?: string): never {
  console.error(`Error: ${message}`)
  if (help) {
    console.log(`\n${help}`)
  }
  process.exit(1)
}
