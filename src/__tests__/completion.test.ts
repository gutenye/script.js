import { describe, expect, test } from 'bun:test'
import { Command } from '../Command'
import { buildSpec, buildSpecText } from '../completion'

describe('buildSpec()', () => {
  test('builds spec with name, description, aliases', () => {
    const c = new Command()
    c.define('myapp | m', 'My app')
    const spec = buildSpec(c)
    expect(spec.name).toBe('myapp')
    expect(spec.aliases).toEqual(['m'])
    expect(spec.description).toBe('My app')
  })

  test('builds flags for boolean option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('-v | --verbose', 'Verbose')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '-v, --verbose': 'Verbose',
    })
  })

  test('builds flags for required value option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('--port <n>', 'Port')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '--port=': 'Port',
    })
  })

  test('builds flags for optional value option', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build').a('--debug [level]', 'Debug')
    const spec = buildSpec(c)
    expect(spec.commands![0].flags).toEqual({
      '--debug=?': 'Debug',
    })
  })

  test('builds completion.positional from argument completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy')
      .a('<env>', 'Environment', ['staging', 'production'])
      .a('<region>', 'Region', ['us', 'eu'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positional).toEqual([
      ['staging', 'production'],
      ['us', 'eu'],
    ])
  })

  test('builds completion.positionalany for variadic argument', () => {
    const c = new Command()
    c.define('myapp')
    c.command('run')
      .a('[...files]', 'Files', ['a.ts', 'b.ts'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positionalany).toEqual(['a.ts', 'b.ts'])
    expect(spec.commands![0].completion?.positional).toBeUndefined()
  })

  test('resolves function completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy')
      .a('<env>', 'Env', () => ['staging', 'production'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.positional).toEqual([
      ['staging', 'production'],
    ])
  })

  test('builds completion.flag for options with completions', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build')
      .a('--format <type>', 'Format', ['json', 'yaml'])
    const spec = buildSpec(c)
    expect(spec.commands![0].completion?.flag).toEqual({
      format: ['json', 'yaml'],
    })
  })

  test('recurses into subcommands', () => {
    const c = new Command()
    c.define('myapp')
    c.command('deploy', 'Deploy app')
    c.command('build', 'Build app')
    const spec = buildSpec(c)
    expect(spec.commands).toHaveLength(2)
    expect(spec.commands![0].name).toBe('deploy')
    expect(spec.commands![1].name).toBe('build')
  })
})

describe('buildSpecText()', () => {
  test('returns undefined when no commands or completions', () => {
    const c = new Command()
    c.define('myapp')
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns undefined when name is missing', () => {
    const c = new Command()
    expect(buildSpecText(c)).toBeUndefined()
  })

  test('returns spec and yaml text', () => {
    const c = new Command()
    c.define('myapp')
    c.command('build', 'Build').a('-v | --verbose', 'Verbose')
    const result = buildSpecText(c)!
    expect(result.spec.name).toBe('myapp')
    expect(result.text).toContain('name: myapp')
    expect(result.text).toContain('build')
  })
})
