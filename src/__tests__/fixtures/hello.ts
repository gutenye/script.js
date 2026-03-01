app
  .cmd('greet', 'Greet someone')
  .a('<name>', 'Name to greet')
  .a('-u | --uppercase')
  .a((name: string, opts: any) => {
    if (opts.uppercase) {
      console.log(`HELLO ${name.toUpperCase()}`)
    } else {
      console.log(`hello ${name}`)
    }
  })
