#!/usr/bin/env script.js

import { castArray } from 'lodash-es'
import fs from '../utils/fs'
import {
  exitWithError,
  findAkeFiles,
  getRemoteDir,
  STORAGE_DIR,
  TEMPLATE_NAME,
} from './shared'

const NAME = 'akectl'
const ENV = process.env

app.meta(NAME)

app
  .cmd('init', 'Create ake file')
  .a('<place>', 'Place', ['local', 'remote'])
  .a(async (place: string) => {
    const akeFiles = await findAkeFiles()
    if (akeFiles.length > 0) {
      exitWithError('Already have an ake file, cannot create a new one')
    }
    let target = 'ake'
    if (place === 'remote') {
      const remoteDir = getRemoteDir()
      await fs.mkdirp(remoteDir)
      target = `${remoteDir}/ake`
    }
    const templateFile = `${STORAGE_DIR}/${TEMPLATE_NAME}`
    if (await fs.pathExists(templateFile)) {
      await fs.copy(templateFile, target)
    } else {
      await fs.writeFile(target, '')
      await fs.chmod(target, 0o755)
    }
    await openEditor(target)
  })

app.cmd('edit', 'Edit ake file').a(async () => {
  const akeFiles = await findAkeFiles()
  const akeFile = akeFiles[0]
  if (!akeFile) {
    exitWithError('No ake file found')
  }
  await openEditor(akeFile)
})

async function openEditor(inputPaths: string | string[]) {
  const paths = castArray(inputPaths)
  const editor =
    ENV.TERM_PROGRAM === 'vscode'
      ? ENV.CURSOR_TRACE_ID
        ? 'cursor'
        : 'code'
      : ENV.EDITOR
  return $`${editor} ${paths}`
}
