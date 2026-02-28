import nodePath from 'node:path'
import fs from './fs'

// suffix name
// a.js -> a-suffix.js
function nameAddSuffix(path: string, suffix: string) {
  const { dir, name, ext } = nodePath.parse(path)
  return nodePath.join(dir, `${name}${suffix}${ext}`)
}

// replace name
// a.js -> name.js
function replaceName(path: string, name: string) {
  const { dir, ext } = nodePath.parse(path)
  return nodePath.join(dir, `${name}${ext}`)
}

// replace ext
// a.js -> a.py
function replaceExt(path: string, newExt: string) {
  const { dir, name } = nodePath.parse(path)
  return nodePath.join(dir, `${name}.${newExt}`)
}

/**
 * If path exists, return a new path with a number appended to it.
 */
async function genUniquePath(path: string): Promise<string> {
  const { dir, name, ext } = nodePath.parse(path)
  let newPath = path
  let index = 1
  while (await fs.pathExists(newPath)) {
    newPath = nodePath.join(dir, `${name} (${index})${ext}`)
    index++
  }
  return newPath
}

/*
 * Check path has ext
 */
function hasExt(path: string, exts: string[]) {
  const ext = nodePath.extname(path).slice(1)
  return exts.includes(ext)
}

export default {
  ...nodePath,
  nameAddSuffix,
  replaceName,
  replaceExt,
  genUniquePath,
  hasExt,
}
