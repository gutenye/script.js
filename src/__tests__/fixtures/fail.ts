app.cmd('boom', 'Run a failing command').add(async () => {
  await $`false`
  console.log('AFTER')
})

app
  .cmd('boom-code', 'Run a command failing with a specific code')
  .add(async () => {
    await $`sh -c 'exit 3'`
  })

app.cmd('crash', 'Throw a non-shell error').add(() => {
  throw new Error('regular failure')
})

app.cmd('missing-cwd', 'Run from a missing directory').add(async () => {
  await $`true`.cwd(import.meta.path)
})

await app.run()
