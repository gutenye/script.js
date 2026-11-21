#!/usr/bin/env bun

import { isNextRequest, runNext } from '../pagination'
import { exitWithError, findAkeFiles, getSuffix } from './shared'

const suffix = process.env.SUFFIX ?? getSuffix()

async function main() {
  if (isNextRequest(Bun.argv.slice(2))) {
    const argv = Bun.argv.slice(2)
    await runNext(argv[0] === '--next' ? argv.slice(1) : argv)
    return
  }
  const akeFile = await findAkeFile()
  runCommand(akeFile)
}

async function findAkeFile() {
  const akeFiles = await findAkeFiles(suffix)

  if (akeFiles.length >= 2) {
    exitWithError(
      'you have duplicated ake files, merge them first',
      akeFiles.join('\n'),
    )
  }

  const akeFile = akeFiles[0]

  if (!akeFile) {
    const name = `ake${suffix}`
    exitWithError(
      `${name} file not found`,
      `Use below commands to create one:\nakectl init local${suffix ? ` ${suffix}` : ''}\nakectl init remote${suffix ? ` ${suffix}` : ''}`,
    )
  }

  return akeFile
}

function runCommand(akeFile: string) {
  const { exitCode } = Bun.spawnSync([akeFile, ...Bun.argv.slice(2)], {
    stdio: ['inherit', 'inherit', 'inherit'],
  })

  process.exit(exitCode)
}

await main()
