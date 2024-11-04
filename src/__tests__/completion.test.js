import { expect, it } from 'bun:test'
import yaml from 'yaml'
import { Argument, Command, Option, buildSpec } from '../completion.js'

it('works', () => {
  const program = new Command()
  program.name('hello').description('Hello').version('1.0.0')

  program
    .command('cmd1')
    .addArgument(
      new Argument('<arg2>', 'Arg2').choices(['arg2A', 'arg2B']).default(60, 'one minute'),
    )
    .argument('[files...]', 'Files')
    .description('command 1')
    .alias('cmd')
    .alias('c')
    .option('--bool', 'Bool')
    .option('--no-bool2', 'NoBool2')
    .option('-a, --string-a [string]', 'StringA', 'default')
    .option('-b, --string-b [values...]', 'StringB', ['1'])
    .addOption(new Option('--year <year>', 'Year').choices([2001, 2002]))
    .complete({
      completion: {
        flags: {
          option: ['$files'],
        },
        positional: [null, ['$files']],
        positionalany: ['any'],
      },
      parsing: 'interspersed',
      name: 'cmd1Override',
    })
    .action(() => {})

  const text = buildSpecText(program)
  console.log(text)
  expect(text).toEqual(
    `
name: hello
description: Hello
flags:
  -V, --version: output the version number
commands:
  - name: cmd1Override
    description: command 1
    aliases:
      - cmd
      - c
    flags:
      --bool: Bool
      --no-bool2: NoBool2
      -a, --string-a=?: StringA
      -b, --string-b=?: StringB
      --year=!: Year
    completion:
      positional:
        - - arg2A
          - arg2B
        - - $files
      flags:
        year:
          - 2001
          - 2002
        option:
          - $files
      positionalany:
        - any
    parsing: interspersed
`.trimStart(),
  )
})

it('no description', () => {
  const program = new Command()
  program.name('hello')

  program
    .command('cmd1 [files...]')
    .option('--bool')
    .action(() => {})

  expect(buildSpecText(program)).toEqual(
    `
name: hello
commands:
  - name: cmd1
    flags:
      --bool: ""
`.trimStart(),
  )
})

it('no name', () => {
  const program = new Command()
  expect(() => buildSpec(program)).toThrow(/command name is missing/)
})

function buildSpecText(program) {
  const spec = buildSpec(program)
  return yaml.stringify(spec)
}
