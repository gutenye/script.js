app.name('output-fixture')

app
  .cmd('rows')
  .add(() => [{ name: 'demo', path: '/example' }])
  .render(app.format.table)
app
  .cmd('record')
  .add(() => ({ name: 'demo' }))
  .render(app.format.record)
app
  .cmd('lines')
  .add(() => ['first', 'second'])
  .render(app.format.lines)
app.cmd('printed').add(() => {
  console.log('hello')
})
app.cmd('mixed').add(() => {
  console.log('progress')
  return { ok: true }
})
app.cmd('shell').add(() => $`printf 'shell output\n'`)
app.cmd('unawaited-shell').add(() => {
  $`printf 'background output\n'`
})
app.cmd('shell-fail').add(async () => {
  await $`sh -c 'exit 3'`
})
app.cmd('unawaited-fail').add(() => {
  $`sh -c 'exit 4'`
})
app.cmd('forward').add(({ argv, json }) => ({ argv, json }))
app
  .cmd('value')
  .add('--value <text>')
  .add((options) => options.value)
app.cmd('fail').add(() => {
  throw Object.assign(new Error('Unavailable'), { code: 'unavailable' })
})
app.cmd('exit').add(() => {
  process.exit(3)
})
app.cmd('empty').add(() => {})
app
  .cmd('empty-rows')
  .add(() => [])
  .render(app.format.table)
app.cmd('invalid').add(() => () => 'not data')
app
  .cmd('composed')
  .add(() => ({ entries: [{ name: 'demo' }], count: 1 }))
  .render(({ entries, count }) => {
    return `
Before

${app.format.table(entries, { color: false })}

${app.format.record({ count }, { color: false })}

${app.format.lines(['first', 'second'])}

After

Total: ${count}

`
  })
app
  .cmd('invalid-renderer')
  .add(() => ({ ok: true }))
  .render(() => ['not a string'] as any)
app
  .cmd('blank-renderer')
  .add(() => ({ ok: true }))
  .render(() => ' \n\t ')
await app.run()
