import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Command } from '../Command'
import { buildArgv, inputSchema } from '../mcp'

const scriptTs = path.resolve(import.meta.dir, '../script.ts')
const fixture = path.resolve(import.meta.dir, 'fixtures/structured.ts')
const specsDir = mkdtempSync(path.join(tmpdir(), 'mcp-specs-'))

// Sends each request on its own line, closes stdin, and returns the replies by id
async function talk(requests: object[]) {
  const server = Bun.spawn(['bun', scriptTs, fixture, '--mcp'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, CARAPACE_SPECS_DIR: specsDir },
  })
  for (const request of requests) {
    server.stdin.write(`${JSON.stringify(request)}\n`)
  }
  server.stdin.end()
  const stdout = await new Response(server.stdout).text()
  await server.exited
  const replies = stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  return new Map(replies.map((reply) => [reply.id, reply]))
}

describe('--mcp', () => {
  test('serves commands as tools over stdio', async () => {
    const replies = await talk([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {} },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'state',
          arguments: { device: 'iPhone', verbose: true },
        },
      },
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'echo', arguments: { text: '-h', count: 2 } },
      },
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'fail', arguments: {} },
      },
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'exit', arguments: {} },
      },
      { jsonrpc: '2.0', id: 7, method: 'nope' },
    ])

    expect(replies.get(1).result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'structured-fixture' },
    })

    const tools = replies.get(2).result.tools
    expect(tools.map((tool: any) => tool.name)).toEqual([
      'state',
      'fail',
      'echo',
      'exit',
      'slow',
    ])
    expect(tools[0].description).toBe(
      'Show state\nExample: structured-fixture state -d iPhone (State on a device)',
    )

    expect(replies.get(3).result).toEqual({
      content: [{ type: 'text', text: '{"device":"iPhone","verbose":true}' }],
      isError: false,
      structuredContent: { device: 'iPhone', verbose: true },
    })

    // A value that looks like a flag stays a positional, and shell output never reaches the protocol stream
    expect(replies.get(4).result).toEqual({
      content: [
        { type: 'text', text: '{"echoed":"-h","count":2}' },
        { type: 'text', text: 'shell:-h' },
      ],
      isError: false,
      structuredContent: { echoed: '-h', count: 2 },
    })

    expect(replies.get(5).result).toEqual({
      content: [
        {
          type: 'text',
          text: '{"error":{"code":"no_device","message":"No device booted"}}',
        },
      ],
      isError: true,
    })

    expect(replies.get(6).result).toEqual({
      content: [{ type: 'text', text: 'bad thing' }],
      isError: true,
    })

    expect(replies.get(7).error.code).toBe(-32601)
  })
})

describe('inputSchema()', () => {
  test('maps arguments and options to JSON Schema', () => {
    const c = new Command()
    c.global('-d, --device [name]', 'Device')
    const send = c
      .cmd('send', 'Send')
      .add('<asset>', 'Asset')
      .add('<amount:number>', 'Amount')
      .add('[...tags]', 'Tags')
      .add('-n, --dry-run', 'Dry run')
      .add('--mode [mode]', 'Mode', ['fast', 'slow'])
      .add('--no-wait', 'Do not wait')
    expect(inputSchema(send)).toEqual({
      type: 'object',
      properties: {
        asset: { type: 'string', description: 'Asset' },
        amount: { type: 'number', description: 'Amount' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        dryRun: { type: 'boolean', description: 'Dry run' },
        mode: { type: 'string', enum: ['fast', 'slow'], description: 'Mode' },
        wait: { type: 'boolean', default: true, description: 'Do not wait' },
        device: { type: 'string', description: 'Device' },
      },
      required: ['asset', 'amount'],
      additionalProperties: false,
    })
  })

  test('gives a command that declares nothing an argv array', () => {
    const c = new Command()
    const t = c.cmd('t', 'Run tests')
    t.add(() => {})
    expect(inputSchema(t)).toMatchObject({
      properties: { argv: { type: 'array', items: { type: 'string' } } },
    })
  })
})

describe('buildArgv()', () => {
  test('puts flags first and positionals after --', () => {
    const c = new Command()
    const send = c
      .cmd('send')
      .add('<asset>')
      .add('[account=exodus_0]')
      .add('[...tags]')
      .add('-n, --dry-run')
      .add('--params [params:json]')
      .add('--no-wait')
    expect(
      buildArgv(send, {
        asset: 'USDC',
        tags: ['a', 'b'],
        dryRun: true,
        params: { a: 1 },
        wait: false,
      }),
    ).toEqual([
      '--dry-run',
      '--params={"a":1}',
      '--no-wait',
      '--',
      'USDC',
      'exodus_0',
      'a',
      'b',
    ])
  })

  test('rejects an unknown argument', () => {
    const c = new Command()
    const send = c.cmd('send').add('<asset>')
    expect(() => buildArgv(send, { assset: 'x' })).toThrow(
      'Unknown argument: assset',
    )
  })
})
