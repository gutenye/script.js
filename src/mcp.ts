import type { Argument } from './Argument'
import type { Command } from './Command'
import { staticChoices } from './describe'
import type { Option } from './Option'
import { captureShellOutput } from './spawn'
import { toErrorShape } from './structured'
import type { ValueType } from './valueType'

// `<script> --mcp` serves every runnable command as an MCP tool over stdio, so agents call it without a shell

const LATEST_PROTOCOL_VERSION = '2025-06-18'

type JsonSchema = Record<string, unknown>

type Tool = {
  name: string
  command: Command
  description: string
  inputSchema: JsonSchema
}

type ToolInput = Record<string, unknown>

export async function serveMcp(root: Command) {
  const tools = listTools(root)
  // Tool calls replace process.stdout.write while they run, and this stream belongs to the protocol
  const writeStdout = process.stdout.write.bind(process.stdout)
  const send = (message: unknown) => {
    writeStdout(`${JSON.stringify(message)}\n`)
  }
  for await (const line of console) {
    if (!line.trim()) continue
    await handleLine({ line, root, tools, send })
  }
}

type HandleLineParams = {
  line: string
  root: Command
  tools: Tool[]
  send: (message: unknown) => void
}

async function handleLine({ line, root, tools, send }: HandleLineParams) {
  let message: any
  try {
    message = JSON.parse(line)
  } catch {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    })
    return
  }
  const { id, method, params } = message ?? {}
  // Notifications such as notifications/initialized expect no reply
  if (id === undefined) return
  try {
    const result = await dispatch({ method, params, root, tools })
    send({ jsonrpc: '2.0', id, result })
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32603
    send({
      jsonrpc: '2.0',
      id,
      error: { code, message: (error as Error).message },
    })
  }
}

type DispatchParams = {
  method: string
  params: any
  root: Command
  tools: Tool[]
}

async function dispatch({ method, params, root, tools }: DispatchParams) {
  if (method === 'initialize') {
    return {
      protocolVersion: params?.protocolVersion ?? LATEST_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: root._name ?? 'script.js', version: '1.0.0' },
      ...(root.description ? { instructions: root.description } : {}),
    }
  }
  if (method === 'ping') return {}
  if (method === 'tools/list') {
    return {
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    }
  }
  if (method === 'tools/call') {
    const tool = tools.find((candidate) => candidate.name === params?.name)
    if (!tool) throw new RpcError(-32602, `Unknown tool: ${params?.name}`)
    return callTool(tool, params?.arguments ?? {})
  }
  throw new RpcError(-32601, `Method not found: ${method}`)
}

async function callTool(tool: Tool, input: ToolInput) {
  let argv: string[]
  try {
    argv = buildArgv(tool.command, input)
  } catch (error) {
    return {
      content: [{ type: 'text', text: (error as Error).message }],
      isError: true,
    }
  }

  const output: string[] = []
  const restore = captureOutput(output)
  let result: unknown
  let isError = false
  let errorText: string | undefined
  try {
    result = await tool.command.execute(argv)
    isError = Boolean(process.exitCode)
  } catch (error) {
    if (error instanceof ExitSignal) {
      isError = error.code !== 0
    } else {
      isError = true
      const { exitCode, ...shape } = toErrorShape(error)
      errorText = JSON.stringify({ error: shape })
    }
  } finally {
    restore()
    process.exitCode = 0
  }

  const content: { type: 'text'; text: string }[] = []
  if (result !== undefined) {
    const text = typeof result === 'string' ? result : JSON.stringify(result)
    content.push({ type: 'text', text })
  }
  if (errorText) content.push({ type: 'text', text: errorText })
  const logs = output.join('').trim()
  if (logs) content.push({ type: 'text', text: logs })
  if (content.length === 0) {
    content.push({ type: 'text', text: isError ? 'Failed' : 'Done' })
  }
  return {
    content,
    isError,
    ...(isPlainObject(result) ? { structuredContent: result } : {}),
  }
}

// One tool per runnable, visible command, named by its path: `wallet send` → wallet_send
export function listTools(root: Command): Tool[] {
  const tools: Tool[] = []
  const visit = (command: Command) => {
    if (command.action) {
      tools.push({
        name: toolName(root, command),
        command,
        description: toolDescription(command),
        inputSchema: inputSchema(command),
      })
    }
    for (const child of command.commands) {
      if (!child.hidden) visit(child)
    }
  }
  visit(root)
  return tools
}

function toolName(root: Command, command: Command) {
  const names: string[] = []
  for (
    let current: Command | undefined = command;
    current && current !== root;
  ) {
    if (current._name) names.unshift(current._name)
    current = current.parent
  }
  const name = names.join('_') || root._name || 'run'
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
}

function toolDescription(command: Command) {
  const examples = command.examples.map(({ command: example, description }) =>
    description
      ? `Example: ${example} (${description})`
      : `Example: ${example}`,
  )
  return [command.description || command.path, ...examples].join('\n')
}

function isPassThrough(command: Command) {
  return command.arguments.length === 0 && command.effectiveOptions.length === 0
}

// The --json switch is implied: tool results are always structured
function toolOptions(command: Command) {
  return command.effectiveOptions.filter(
    (option) => option.attributeName !== 'json',
  )
}

export function inputSchema(command: Command): JsonSchema {
  if (isPassThrough(command)) {
    return {
      type: 'object',
      properties: {
        argv: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arguments passed through to the command as is',
        },
      },
      additionalProperties: false,
    }
  }
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []
  for (const argument of command.arguments) {
    properties[argument.name] = argumentSchema(argument)
    if (argument.required) required.push(argument.name)
  }
  for (const option of toolOptions(command)) {
    properties[option.attributeName] = optionSchema(option)
    // An option with a <value> placeholder must be passed, as on the command line
    if (option.required) required.push(option.attributeName)
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  }
}

function argumentSchema(argument: Argument): JsonSchema {
  return valueSchema({
    valueType: argument.valueType,
    isArray: argument.variadic,
    choices: staticChoices(argument.completion),
    description: argument.description,
    defaultValue: argument.defaultValue,
  })
}

function optionSchema(option: Option): JsonSchema {
  if (option.negate) {
    return withDescription(
      { type: 'boolean', default: true },
      option.description,
    )
  }
  if (option.isBoolean()) {
    return withDescription({ type: 'boolean' }, option.description)
  }
  return valueSchema({
    valueType: option.valueType,
    isArray: option.variadic,
    choices: staticChoices(option.completion),
    description: option.description,
    defaultValue: option.defaultValue,
  })
}

type ValueSchemaParams = {
  valueType?: ValueType
  isArray: boolean
  choices?: string[]
  description: string
  defaultValue: unknown
}

function valueSchema({
  valueType,
  isArray,
  choices,
  description,
  defaultValue,
}: ValueSchemaParams): JsonSchema {
  const item = itemSchema(valueType, choices)
  const schema: JsonSchema = isArray ? { type: 'array', items: item } : item
  if (defaultValue !== undefined) schema.default = defaultValue
  return withDescription(schema, description)
}

function itemSchema(valueType: ValueType | undefined, choices?: string[]) {
  if (valueType === 'number') return { type: 'number' }
  // A json value can be any JSON
  if (valueType === 'json') return {}
  return choices ? { type: 'string', enum: choices } : { type: 'string' }
}

function withDescription(schema: JsonSchema, description: string) {
  return description ? { ...schema, description } : schema
}

// Tool input → argv: flags first with inline values, then every positional after --, so no value is read as a flag
export function buildArgv(command: Command, input: ToolInput): string[] {
  if (isPassThrough(command)) {
    const passed = input.argv ?? []
    if (!Array.isArray(passed)) throw new Error('argv must be an array')
    return passed.map(String)
  }

  const options = toolOptions(command)
  const known = new Set([
    ...command.arguments.map((argument) => argument.name),
    ...options.map((option) => option.attributeName),
  ])
  for (const key of Object.keys(input)) {
    if (!known.has(key)) throw new Error(`Unknown argument: ${key}`)
  }

  const flags: string[] = []
  for (const option of options) {
    const value = input[option.attributeName]
    if (value === undefined || value === null) continue
    const flag = (option.long ?? option.short) as string
    if (option.negate) {
      if (value === false) flags.push(flag)
      continue
    }
    if (option.isBoolean()) {
      if (value === true) flags.push(flag)
      continue
    }
    if (value === true && option.optional) {
      flags.push(flag)
      continue
    }
    const values = option.variadic ? [value].flat() : [value]
    for (const item of values) {
      flags.push(`${flag}=${serialize(item, option.valueType)}`)
    }
  }

  const positionals: string[] = []
  const lastGiven = command.arguments.findLastIndex(
    (argument) => input[argument.name] !== undefined,
  )
  for (let index = 0; index <= lastGiven; index++) {
    const argument = command.arguments[index]
    let value = input[argument.name]
    if (value === undefined) {
      if (argument.defaultValue === undefined) {
        const given = command.arguments[lastGiven].name
        throw new Error(`${argument.name} is required when ${given} is given`)
      }
      value = argument.defaultValue
    }
    const values = argument.variadic ? [value].flat() : [value]
    positionals.push(
      ...values.map((item) => serialize(item, argument.valueType)),
    )
  }

  return [...flags, '--', ...positionals]
}

function serialize(value: unknown, valueType: ValueType | undefined) {
  return valueType === 'json' ? JSON.stringify(value) : String(value)
}

// Collects everything a tool call prints, and turns process.exit into an exception so the server keeps running
function captureOutput(output: string[]) {
  const originals = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
    write: process.stdout.write,
    exit: process.exit,
  }
  const collect = (...args: unknown[]) => {
    output.push(
      `${args.map((arg) => (typeof arg === 'string' ? arg : Bun.inspect(arg))).join(' ')}\n`,
    )
  }
  console.log = collect
  console.info = collect
  console.debug = collect
  console.warn = collect
  console.error = collect
  process.stdout.write = ((chunk: unknown) => {
    output.push(String(chunk))
    return true
  }) as typeof process.stdout.write
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? Number(process.exitCode ?? 0))
  }) as typeof process.exit
  captureShellOutput((text) => output.push(text))
  return () => {
    console.log = originals.log
    console.info = originals.info
    console.debug = originals.debug
    console.warn = originals.warn
    console.error = originals.error
    process.stdout.write = originals.write
    process.exit = originals.exit
    captureShellOutput(undefined)
  }
}

class ExitSignal extends Error {
  code: number

  constructor(code: number) {
    super(`exit ${code}`)
    this.code = code
  }
}

class RpcError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}
