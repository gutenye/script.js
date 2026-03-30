app
  .cmd('greet', 'Greet someone')
  .add('<name>', 'Name to greet')
  .add('-u, --uppercase')
  .add((name: string, opts: any) => {
    if (opts.uppercase) {
      console.log(`HELLO ${name.toUpperCase()}`)
    } else {
      console.log(`hello ${name}`)
    }
  })
