import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Command } from '../Command'
import { buildSpecText, installCompletion } from '../completion'

describe('buildSpecText()', () => {
  test('returns undefined when no name or no commands', () => {
    const noName = new Command()
    expect(buildSpecText(noName)).toBeUndefined()

    const noCommands = new Command()
    noCommands.name('myapp')
    expect(buildSpecText(noCommands)).toBeUndefined()
  })

  test('name', () => {
    const c = new Command()
    c.name('m, myapp', 'My app')
    c.cmd('build', 'Build')
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
description: My app
aliases:
  - m
commands:
  - name: build
    description: Build
`.trimStart(),
    )
  })

  test('flags', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('build')
      .add('-v, --verbose', 'Verbose')
      .add('--port <n>', 'Port')
      .add('--debug [level]', 'Debug')
      .add('--format <type>', 'Format', ['json', 'yaml'])
      .add('--from', 'Source', ['1', '2'])
      .add('--from2 [value=1]', 'Source2', ['1', '2'])
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
commands:
  - name: build
    flags:
      -v, --verbose: Verbose
      --port=: Port
      --debug=?: Debug
      --format=: Format
      --from=: Source
      --from2=: Source2
    completion:
      flag:
        format:
          - json
          - yaml
        from:
          - "1"
          - "2"
        from2:
          - "1"
          - "2"
`.trimStart(),
    )
  })

  test('completions', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('deploy')
      .add('<env>', 'Environment', ['staging', 'production'])
      .add('<region>', 'Region', () => ['us', 'eu'])
    c.cmd('run').add('[...files]', 'Files', ['a.ts', 'b.ts'])
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
commands:
  - name: deploy
    completion:
      positional:
        - - staging
          - production
        - - us
          - eu
  - name: run
    completion:
      positionalany:
        - a.ts
        - b.ts
`.trimStart(),
    )
  })

  test('macros', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('open').add('<file>', 'File', ['$files'])
    c.cmd('run').add('[...targets]', 'Targets', ['$dirs', '$(mycmd _complete)'])
    c.cmd('build').add('--config <path>', 'Config', ['$files([.json, .yaml])'])
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
commands:
  - name: open
    completion:
      positional:
        - - $files
  - name: run
    completion:
      positionalany:
        - $dirs
        - $(mycmd _complete)
  - name: build
    flags:
      --config=: Config
    completion:
      flag:
        config:
          - $files([.json, .yaml])
`.trimStart(),
    )
  })

  test('default command', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd()
      .add('<cmd>', 'Command to run', ['a', 'b'])
      .add('--format <type>', 'Format', ['json', 'yaml'])
    c.cmd('cmd1', 'First command')
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
flags:
  --format=: Format
completion:
  positional:
    - - a
      - b
  flag:
    format:
      - json
      - yaml
commands:
  - name: cmd1
    description: First command
`.trimStart(),
    )
  })

  test('subcommands', () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('deploy', 'Deploy app')
    c.cmd('build', 'Build app')
    c.cmd('wd, web d, dev', 'Web development').add('<task>', 'Task', [
      'build',
      'serve',
    ])
    expect(buildSpecText(c)?.text).toBe(
      `
name: myapp
commands:
  - name: deploy
    description: Deploy app
  - name: build
    description: Build app
  - name: web
    commands:
      - name: dev
        description: Web development
        aliases:
          - d
        completion:
          positional:
            - &a1
              - build
              - serve
  - name: wd
    description: Web development
    completion:
      positional:
        - *a1
`.trimStart(),
    )
  })
})

describe('installCompletion()', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('writes spec file when command has name and commands', async () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    const content = fs.readFileSync(path.join(tmpDir, 'myapp.yaml'), 'utf8')
    expect(content).toContain('name: myapp')
  })

  test('skips when name is missing', async () => {
    const c = new Command()
    c.cmd('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    expect(fs.readdirSync(tmpDir)).toHaveLength(0)
  })

  test('skips write when file is identical', async () => {
    const c = new Command()
    c.name('myapp')
    c.cmd('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    const stat1 = fs.statSync(path.join(tmpDir, 'myapp.yaml'))
    await installCompletion(c, { specsDir: tmpDir })
    const stat2 = fs.statSync(path.join(tmpDir, 'myapp.yaml'))
    expect(stat1.mtimeMs).toBe(stat2.mtimeMs)
  })

  test('auto-names ake scripts from scriptPath', async () => {
    const c1 = new Command()
    c1.cmd('build', 'Build')
    await installCompletion(c1, {
      specsDir: tmpDir,
      scriptPath: '/some/path/ake',
    })

    const c2 = new Command()
    c2.cmd('build', 'Build')
    await installCompletion(c2, {
      specsDir: tmpDir,
      scriptPath: '/some/path/akefoo',
    })

    const files = fs.readdirSync(tmpDir).sort()
    expect(files.length).toBe(2)
    expect(files[0]).toMatch(/^ake\..*\.yaml$/)
    expect(files[1]).toMatch(/^akefoo\..*\.yaml$/)
  })
})
