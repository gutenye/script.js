app.cmd().add(() => {
  console.log(app.format.lines(['first', 'second']))
})

await app.run()
