import fs from 'node:fs/promises'

/**
 * Check path exists
 */
export async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    throw err
  }
}

/**
 * Read file safely
 * Returns undefined if file does not exits
 */
export async function readFileSafe(...args) {
  try {
    return fs.readFile(...args)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return
    }
    throw err
  }
}
