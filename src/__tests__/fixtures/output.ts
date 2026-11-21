const { format } = app

app.name('output-fixture')

app
  .cmd('rows')
  .add(() => [{ name: 'demo', path: '/example' }])
  .render(format.table)
app
  .cmd('record')
  .add(() => ({ name: 'demo' }))
  .render(format.record)
app
  .cmd('lines')
  .add(() => ['first', 'second'])
  .render(format.lines)
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
  .render(format.table)
app.cmd('invalid').add(() => () => 'not data')
app
  .cmd('composed')
  .add(() => ({ entries: [{ name: 'demo' }], count: 1 }))
  .render(({ entries, count }) => {
    return [
      ' \nBefore ',
      format.table(entries, { color: false }),
      format.section('Summary', format.record({ count }, { color: false })),
      '',
      ' \t ',
      format.section('Hidden', format.table([])),
      format.field('Count', count),
      format.field('Hidden field', undefined),
      format.lines(['first', 'second']),
      'After',
      `Total: ${count}\n\n`,
    ]
  })
app
  .cmd('invalid-renderer')
  .add(() => ({ ok: true }))
  .render(() => [['nested array']] as any)
app
  .cmd('blank-renderer')
  .add(() => ({ ok: true }))
  .render(() => [' \n\t ', ''])
app
  .cmd('large')
  .add(() => ({ data: 'x'.repeat(2000000) }))
  .render(({ data }) => data)
app.cmd('large-after-print').add(() => {
  process.stdout.write('progress\n')
  return 'x'.repeat(2000000)
})
await app.run()
