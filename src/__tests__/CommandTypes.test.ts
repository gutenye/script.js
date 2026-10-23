import { describe, expectTypeOf, test } from 'bun:test'
import { Command } from '../Command'
import type { ArgumentType, Context, OptionShape } from '../CommandTypes'

describe('ArgumentType', () => {
  test('infers required, optional, defaulted, typed and variadic arguments', () => {
    expectTypeOf<ArgumentType<'<screen>'>>().toEqualTypeOf<string>()
    expectTypeOf<ArgumentType<'[params]'>>().toEqualTypeOf<string | undefined>()
    expectTypeOf<ArgumentType<'[account=exodus_0]'>>().toEqualTypeOf<string>()
    expectTypeOf<ArgumentType<'<amount:number>'>>().toEqualTypeOf<number>()
    expectTypeOf<ArgumentType<'[params:json]'>>().toEqualTypeOf<unknown>()
    expectTypeOf<ArgumentType<'[...assets]'>>().toEqualTypeOf<string[]>()
  })
})

describe('OptionShape', () => {
  test('names options by their camel-cased long flag', () => {
    expectTypeOf<OptionShape<'-n, --dry-run'>>().toEqualTypeOf<{
      dryRun?: boolean
    }>()
    expectTypeOf<OptionShape<'-v'>>().toEqualTypeOf<{ v?: boolean }>()
  })

  test('infers values, defaults, negation and arrays', () => {
    expectTypeOf<OptionShape<'-d, --device [name]'>>().toEqualTypeOf<{
      device?: string | true
    }>()
    expectTypeOf<
      OptionShape<'-t, --timeout [ms:number=10000]'>
    >().toEqualTypeOf<{
      timeout: number
    }>()
    expectTypeOf<OptionShape<'-s, --string <value>'>>().toEqualTypeOf<{
      string?: string
    }>()
    expectTypeOf<OptionShape<'--no-seeds'>>().toEqualTypeOf<{
      seeds: boolean
    }>()
    expectTypeOf<OptionShape<'-a, --array [values...]'>>().toEqualTypeOf<{
      array?: string[]
    }>()
  })
})

describe('add()', () => {
  test('types the handler from declared arguments and options', () => {
    new Command()
      .cmd('send')
      .add('<asset>')
      .add('<amount:number>')
      .add('-n, --dry-run')
      .add((asset, amount, options, context) => {
        expectTypeOf(asset).toEqualTypeOf<string>()
        expectTypeOf(amount).toEqualTypeOf<number>()
        expectTypeOf(options.dryRun).toEqualTypeOf<boolean | undefined>()
        expectTypeOf(context).toEqualTypeOf<Context>()
      })
  })

  test('leaves the rest untyped when inherited options may insert one', () => {
    new Command()
      .cmd('accounts')
      .add('[name]')
      .add((name, ...rest) => {
        expectTypeOf(name).toEqualTypeOf<string | undefined>()
        expectTypeOf(rest).toEqualTypeOf<any[]>()
      })
  })
})
