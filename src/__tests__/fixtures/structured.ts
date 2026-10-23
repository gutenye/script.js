app.name('structured-fixture', 'Fixture for structured output')
app.json()
app.global('-d, --device [name]', 'Device')

app
  .cmd('state', 'Show state')
  .example('structured-fixture state -d iPhone', 'State on a device')
  .add('-v, --verbose', 'Verbose')
  .add((options) => ({
    device: options.device ?? null,
    verbose: Boolean(options.verbose),
  }))

app.cmd('fail', 'Fail with a code').add(() => {
  throw Object.assign(new Error('No device booted'), { code: 'no_device' })
})

app
  .cmd('echo', 'Run a shell command')
  .add('<text>', 'Text to echo')
  .add('--count [n:number=1]', 'Repeat count')
  .add(async (text, options) => {
    await $`echo shell:${text}`
    return { echoed: text, count: options.count }
  })

app.cmd('exit', 'Exit through process.exit').add(() => {
  console.error('bad thing')
  process.exit(3)
})

app
  .cmd('slow', 'Never finishes')
  .timeout(100)
  .add(() => new Promise(() => {}))
