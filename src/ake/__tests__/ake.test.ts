import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { REMOTE_DIR } from '../shared'

const akeBinary = path.resolve(import.meta.dir, '../ake.ts')
const indexPath = path.resolve(import.meta.dir, '../../index')

describe('ake', () => {
  let projectDir: string
  let akeFile: string
  let webDir: string

  beforeEach(() => {
    projectDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'ake-int-')),
    )
    akeFile = path.join(projectDir, 'ake')
    webDir = path.join(projectDir, 'web')
    fs.writeFileSync(akeFile, makeAkeContent())
    fs.chmodSync(akeFile, 0o755)
    fs.mkdirSync(webDir)
  })

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true })
  })

  describe('auto CWD', () => {
    test('./ake pwd from project dir', () => {
      const result = runDirect(akeFile, projectDir, ['pwd'])
      expect(result.stdout).toBe(projectDir)
      expect(result.exitCode).toBe(0)
    })

    test('../ake pwd from subdirectory', () => {
      const result = runDirect(akeFile, webDir, ['pwd'])
      expect(result.stdout).toBe(projectDir)
      expect(result.exitCode).toBe(0)
    })

    test('$`cmd`.cwd("web") resolves relative to project dir from subdirectory', () => {
      const result = runDirect(akeFile, webDir, ['pwd-in-web'])
      expect(result.stdout).toBe(webDir)
      expect(result.exitCode).toBe(0)
    })
  })

  describe('upward search via ake binary', () => {
    test('finds ake from project dir', () => {
      const result = runViaAke(projectDir, ['pwd'])
      expect(result.stdout).toBe(projectDir)
      expect(result.exitCode).toBe(0)
    })

    test('finds ake from subdirectory', () => {
      const result = runViaAke(webDir, ['pwd'])
      expect(result.stdout).toBe(projectDir)
      expect(result.exitCode).toBe(0)
    })
  })

  describe('remote ake file', () => {
    let remoteDir: string

    beforeEach(() => {
      const uniqueName = projectDir.replaceAll('/', '_')
      remoteDir = path.join(REMOTE_DIR, uniqueName)
      fs.mkdirSync(remoteDir, { recursive: true })
      fs.writeFileSync(path.join(remoteDir, 'ake'), makeAkeContent())
      fs.chmodSync(path.join(remoteDir, 'ake'), 0o755)
      fs.rmSync(akeFile)
    })

    afterEach(() => {
      fs.rmSync(remoteDir, { recursive: true, force: true })
    })

    test('ake binary finds remote and CWD is project dir', () => {
      const result = runViaAke(projectDir, ['pwd'])
      expect(result.stdout).toBe(projectDir)
      expect(result.exitCode).toBe(0)
    })
  })

  describe('completion spec', () => {
    let specsDir: string

    beforeEach(() => {
      specsDir = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), 'ake-specs-')),
      )
    })

    afterEach(() => {
      fs.rmSync(specsDir, { recursive: true, force: true })
    })

    test('generates spec file with auto name', () => {
      const env = { CARAPACE_SPECS_DIR: specsDir }
      const result = runDirect(akeFile, projectDir, ['pwd'], env)
      expect(result.exitCode).toBe(0)
      const uniqueName = projectDir.replaceAll('/', '_')
      const specName = `ake.${uniqueName}`
      const specFile = path.join(specsDir, `${specName}.yaml`)
      const spec = fs.readFileSync(specFile, 'utf8')
      expect(spec).toEqual(`name: ${specName}
commands:
  - name: pwd
    description: Print working directory
  - name: pwd-in-web
    description: Print web dir via $
  - name: deploy
    description: Deploy
    completion:
      positional:
        - - staging
          - prod
`)
    })
  })
})

function makeAkeContent() {
  return `#!/usr/bin/env bun
import { app, $ } from '${indexPath}'
app.cmd('pwd', 'Print working directory').add(() => {
  console.log(process.cwd())
})
app.cmd('pwd-in-web', 'Print web dir via $').add(async () => {
  console.log($\`pwd\`.cwd('web').text())
})
app.cmd('deploy', 'Deploy').add('<env>', 'Environment', ['staging', 'prod'])
`
}

function spawn(cmd: string[], cwd: string, env?: Record<string, string>) {
  const result = Bun.spawnSync(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, ...env },
  })
  const lines = result.stdout.toString().trimEnd().split('\n')
  return {
    stdout: lines.at(-1) ?? '',
    allStdout: result.stdout.toString().trimEnd(),
    stderr: result.stderr.toString().trimEnd(),
    exitCode: result.exitCode,
  }
}

function runDirect(
  akeFile: string,
  cwd: string,
  args: string[],
  env?: Record<string, string>,
) {
  return spawn(['bun', akeFile, ...args], cwd, env)
}

function runViaAke(
  cwd: string,
  args: string[],
  env?: Record<string, string>,
) {
  return spawn(['bun', akeBinary, ...args], cwd, env)
}
