import { fs, nodePath } from '#/utils'

export { fs, nodePath }

export const cp = fs.copy

export const mv = fs.move

export const rm = fs.remove

export const mkdir = fs.mkdirp

export const ls = glob

export const lns = fs.symlink
