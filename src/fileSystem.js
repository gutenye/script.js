import fs from './utils/fs'

export { fs }

export const cp = fs.copy

export const mv = fs.move

export const rm = fs.remove

export const mkdir = fs.mkdirp

export const ls = glob

export const ln = fs.ln

export const lns = fs.symlink
