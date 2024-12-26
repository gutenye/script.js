# 🚀 Getting Started

### 1️⃣ Install

First, make sure [Bun](https://bun.sh) and [Carapace](https://github.com/carapace-sh/carapace-bin) are installed.

```
npm install -g @gutenye/script.js
```

### 2️⃣ Write script

```ts
#!/usr/bin/env gutenye-script.js

app
  .name('hello')

app.command('list [files...]')
  .action((files, options) => {
    ..
  })

```