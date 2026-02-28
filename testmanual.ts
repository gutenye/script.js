#!/usr/bin/env script.js

cmd('greet | g', 'Greet someone')
  .a('<name>', 'Name to greet', ['John', 'Mike'])
  .a('-u | --uppercase')
  .a((name: string, options: any, context: any) => {
    console.log({
      name,
      options,
      context,
    })
  })
