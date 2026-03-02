#!/usr/bin/env script.js

app
  .cmd('greet | g', 'Greet someone')
  .add('<name>', 'Name to greet', ['John', 'Mike'])
  .add('-u | --uppercase')
  .add((name: string, options: any, context: any) => {
    console.log({
      name,
      options,
      context,
    })
  })
