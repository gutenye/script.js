app.cmd('count', 'Run exactly once').add(() => {
  console.log('ran')
})

await app.run()
console.log(`beforeExit listeners: ${process.listenerCount('beforeExit')}`)
