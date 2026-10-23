import type { Options } from './parseArgv'

// Infers handler parameters from the strings passed to add(), e.g.
// add('<amount:number>').add('-t, --timeout [ms:number=10000]') → (amount: number, options: { timeout: number }, context)

export type Context = {
  argv: string[]
  // The result will be printed as JSON: app.json() is on and --json was passed or stdout is piped
  json: boolean
}

export type CompletionOrDefault = unknown

// The options of a command that has declared none yet
export type NoOptions = Record<never, never>

// A positional or flag string adds an argument or an option to the handler's parameters
export type AddArgument<
  Args extends unknown[],
  Raw extends string,
> = Raw extends `-${string}` ? Args : [...Args, ArgumentType<Raw>]

export type AddOption<Opts, Raw extends string> = Raw extends `-${string}`
  ? Opts & OptionShape<Raw>
  : Opts

// Own options guarantee an options parameter; without them, inherited global() options may still insert one, so the rest stays untyped
export type Handler<
  Args extends unknown[],
  Opts,
> = number extends Args['length']
  ? (...args: any[]) => unknown
  : [keyof Opts] extends [never]
    ? (...args: [...Args, ...any[]]) => unknown
    : (
        ...args: [
          ...Args,
          Options<Opts> & Record<string, unknown>,
          Context,
          ...any[],
        ]
      ) => unknown

export type ArgumentType<Raw extends string> =
  Trim<Raw> extends `${string}...${string}`
    ? ValueOf<Trim<Raw>>[]
    : Trim<Raw> extends `<${string}`
      ? ValueOf<Trim<Raw>>
      : Trim<Raw> extends `[${string}=${string}]`
        ? ValueOf<Trim<Raw>>
        : ValueOf<Trim<Raw>> | undefined

export type OptionShape<Flags extends string> =
  IsNegate<Flags> extends true
    ? { [Key in OptionName<Flags>]: boolean }
    : Flags extends `${string}[${string}=${string}]${string}`
      ? { [Key in OptionName<Flags>]: OptionValue<Flags> }
      : { [Key in OptionName<Flags>]?: OptionValue<Flags> }

type OptionValue<Flags extends string> =
  Flags extends `${string}<${infer Placeholder}>${string}`
    ? Placeholder extends `${string}...${string}`
      ? ValueOf<Placeholder>[]
      : ValueOf<Placeholder>
    : Flags extends `${string}[${infer Placeholder}]${string}`
      ? Placeholder extends `${string}...${string}`
        ? ValueOf<Placeholder>[]
        : Placeholder extends `${string}=${string}`
          ? ValueOf<Placeholder>
          : ValueOf<Placeholder> | true
      : boolean

type OptionName<Flags extends string> = [LongFlag<Flags>] extends [never]
  ? ShortFlag<Flags>
  : LongFlag<Flags> extends `no-${infer Name}`
    ? Camel<Name>
    : Camel<LongFlag<Flags>>

type IsNegate<Flags extends string> = [LongFlag<Flags>] extends [never]
  ? false
  : LongFlag<Flags> extends `no-${string}`
    ? true
    : false

type LongFlag<Flags extends string> = Flags extends `${string}--${infer Rest}`
  ? FirstWord<Rest>
  : never

type ShortFlag<Flags extends string> = Flags extends `-${infer Rest}`
  ? FirstWord<Rest extends `${infer Letter},${string}` ? Letter : Rest>
  : never

type FirstWord<Text extends string> = Text extends `${infer Word} ${string}`
  ? Word
  : Text

type Camel<Text extends string> = Text extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : Text

type ValueOf<Placeholder extends string> =
  Placeholder extends `${string}:number${string}`
    ? number
    : Placeholder extends `${string}:json${string}`
      ? unknown
      : string

type Trim<Text extends string> = Text extends ` ${infer Rest}`
  ? Trim<Rest>
  : Text extends `${infer Rest} `
    ? Trim<Rest>
    : Text
