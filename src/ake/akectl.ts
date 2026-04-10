#!/usr/bin/env script.js

import { castArray } from 'lodash-es'
import fs from '../utils/fs'
import {
  exitWithError,
  findAkeFiles,
  getAkeFilenames,
  getRemoteDir,
  STORAGE_DIR,
  TEMPLATE_NAME,
} from './shared'

const NAME = 'akectl'
const ENV = process.env

app.name(NAME)

app
  .cmd('init', 'Create ake file')
  .add('<place>', 'Place', ['local', 'remote'])
  .add('[suffix]', 'Ake file suffix (e.g. "foo" for akefoo)')
  .add('--ci', 'Skip opening editor')
  .add(async (place: string, suffix: string, options: { ci?: boolean }) => {
    suffix = suffix ?? ''
    const akeFiles = await findAkeFiles(suffix)
    if (akeFiles.length > 0) {
      exitWithError('Already have an ake file, cannot create a new one')
    }
    const filenames = getAkeFilenames(suffix)
    let target = filenames[0]
    if (place === 'remote') {
      const remoteDir = getRemoteDir()
      await fs.mkdirp(remoteDir)
      target = `${remoteDir}/${filenames[0]}`
    }
    const templateFile = `${STORAGE_DIR}/${TEMPLATE_NAME}`
    if (await fs.pathExists(templateFile)) {
      await fs.copy(templateFile, target)
    } else {
      await fs.writeFile(target, '')
      await fs.chmod(target, 0o755)
    }
    console.log(`Created ${target}`)
    if (!options.ci) {
      await openEditor(target)
    }
  })

app
  .cmd('install-bin', 'Create a wrapper script for ake with a suffix')
  .add('<prefix>', 'Path prefix (e.g. ~/bin/ake, ~/bin/a)')
  .add('<suffix>', 'Suffix to append (e.g. "foo" → ~/bin/akefoo)')
  .add(async (prefix: string, suffix: string) => {
    const target = `${prefix}${suffix}`
    const content = `
#!/usr/bin/env bash

SUFFIX=${suffix} exec ${prefix} "$@"
`.trim()
    await fs.writeFile(target, content)
    await fs.chmod(target, 0o755)
    console.log(`created ${target}`)
  })

app
  .cmd('edit', 'Edit ake file')
  .add('[suffix]', 'Ake file suffix (e.g. "foo" for akefoo)')
  .add(async (suffix: string) => {
    suffix = suffix ?? ''
    const akeFiles = await findAkeFiles(suffix)
    const akeFile = akeFiles[0]
    if (!akeFile) {
      const name = `ake${suffix}`
      exitWithError(`${name} file not found`)
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
