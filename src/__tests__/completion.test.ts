import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Command } from '../Command'
import { buildSpec, buildSpecText, installCompletion } from '../completion'

describe('buildSpec()', () => {
  test('builds spec with name, description, aliases', () => {
    const c = new Command()
    c.meta('myapp | m', 'My app')
    const spec = buildSpec(c)
    expect(spec.name).toBe('myapp')
    expect(spec.aliases).toEqual(['m'])
    expect(spec.description).toBe('My app')
  })

  test('builds flags for boolean option', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build').a('-v | --verbose', 'Verbose')
    const spec = buildSpec(c)
    expect(spec.commands?.[0].flags).toEqual({
      '-v, --verbose': 'Verbose',
    })
  })

  test('builds flags for required value option', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build').a('--port <n>', 'Port')
    const spec = buildSpec(c)
    expect(spec.commands?.[0].flags).toEqual({
      '--port=': 'Port',
    })
  })

  test('builds flags for optional value option', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build').a('--debug [level]', 'Debug')
    const spec = buildSpec(c)
    expect(spec.commands?.[0].flags).toEqual({
      '--debug=?': 'Debug',
    })
  })

  test('builds completion.positional from argument completions', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('deploy')
      .a('<env>', 'Environment', ['staging', 'production'])
      .a('<region>', 'Region', ['us', 'eu'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.positional).toEqual([
      ['staging', 'production'],
      ['us', 'eu'],
    ])
  })

  test('builds completion.positionalany for variadic argument', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('run').a('[...files]', 'Files', ['a.ts', 'b.ts'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.positionalany).toEqual([
      'a.ts',
      'b.ts',
    ])
    expect(spec.commands?.[0].completion?.positional).toBeUndefined()
  })

  test('resolves function completions', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('deploy').a('<env>', 'Env', () => ['staging', 'production'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.positional).toEqual([
      ['staging', 'production'],
    ])
  })

  test('builds completion.flag for options with completions', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build').a('--format <type>', 'Format', ['json', 'yaml'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.flag).toEqual({
      format: ['json', 'yaml'],
    })
  })

  test('passes through $files macro in positional completion', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('open').a('<file>', 'File', ['$files'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.positional).toEqual([['$files']])
  })

  test('passes through $dirs and shell command macros in positionalany', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('run').a('[...targets]', 'Targets', ['$dirs', '$(mycmd _complete)'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.positionalany).toEqual([
      '$dirs',
      '$(mycmd _complete)',
    ])
  })

  test('passes through macros in flag completion', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build').a('--config <path>', 'Config', ['$files([.json, .yaml])'])
    const spec = buildSpec(c)
    expect(spec.commands?.[0].completion?.flag).toEqual({
      config: ['$files([.json, .yaml])'],
    })
  })

  test('recurses into subcommands', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('deploy', 'Deploy app')
    c.cmd('build', 'Build app')
    const spec = buildSpec(c)
    expect(spec.commands).toHaveLength(2)
    expect(spec.commands?.[0].name).toBe('deploy')
    expect(spec.commands?.[1].name).toBe('build')
  })
})

describe('buildSpecText()', () => {
  test('returns undefined when no commands or completions', () => {
    const c = new Command()
    c.meta('myapp')
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns undefined when name is missing', () => {
    const c = new Command()
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns spec and yaml text', () => {
    const c = new Command()
    c.meta('myapp')
    c.cmd('build', 'Build').a('-v | --verbose', 'Verbose')
    const result = buildSpecText(c)
    expect(result?.spec.name).toBe('myapp')
    expect(result?.text).toContain('name: myapp')
    expect(result?.text).toContain('build')
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
    c.meta('myapp')
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
    c.meta('myapp')
    c.cmd('build', 'Build')
    await installCompletion(c, { specsDir: tmpDir })
    const stat1 = fs.statSync(path.join(tmpDir, 'myapp.yaml'))
    await installCompletion(c, { specsDir: tmpDir })
    const stat2 = fs.statSync(path.join(tmpDir, 'myapp.yaml'))
    expect(stat1.mtimeMs).toBe(stat2.mtimeMs)
  })

  test('auto-names ake scripts from scriptPath', async () => {
    const c = new Command()
    c.cmd('build', 'Build')
    await installCompletion(c, {
      specsDir: tmpDir,
      scriptPath: '/some/path/ake',
    })
    const files = fs.readdirSync(tmpDir)
    expect(files.length).toBe(1)
    expect(files[0]).toMatch(/^ake\..*\.yaml$/)
  })
})
