#!/usr/bin/env bun

import { exitWithError, findAkeFiles } from './shared'

async function main() {
  const akeFile = await findAkeFile()
  runCommand(akeFile)
}

async function findAkeFile() {
  const akeFiles = await findAkeFiles()

  if (akeFiles.length >= 2) {
    exitWithError(
      'you have duplicated ake files, merge them first',
      akeFiles.join('\n'),
    )
  }

  const akeFile = akeFiles[0]

  if (!akeFile) {
    exitWithError(
      'ake file not found',
      'Use below commands to create one:\nakectl init local\nakectl init remote',
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
