# Script.js

**Write shell scripts in JavaScript** and leverage the power of JavaScript's simplicity and flexibility to make your shell scripting easier and faster. Why struggle with the complexity of Bash or other shell scripting languages when you already know JavaScript? Script.js allows you to write and run complex shell scripts using JavaScript, saving you time and reducing errors.

**Show your ❤️ and support by starring this project and following the author, [Guten Ye](https://github.com/gutenye)!**

[![Stars](https://img.shields.io/github/stars/gutenye/script.js?style=social)](https://github.com/gutenye/script.js) [![NPM Version](https://img.shields.io/npm/v/@gutenye/script.js)](https://www.npmjs.com/package/@gutenye/script.js) [![License](https://img.shields.io/github/license/gutenye/script.js?color=blue)](https://github.com/gutenye/script.js/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)](https://github.com/gutenye/script.js#contribute)

## Features

- **Fast to write**: Global commands mean no imports needed. Open the editor, write a few lines, and run it.
- **Fun to run**: Built-in autocompletion support via Carapace.
- **JavaScript Power**: Access the entire JavaScript ecosystem.
- **Subcommands**: Create and organize subcommands effortlessly.
- **Help Documentation**: Auto-generated command help with argument validation.
- **Fast Execution**: Powered by Bun for fast startup and execution.

## Getting Started

### 1. Install

First, make sure [Bun](https://bun.sh) and [Carapace](https://github.com/carapace-sh/carapace-bin) are installed.

```sh
npm install -g @gutenye/script.js
```

### 2. Write Your First Script

Create a file named `hello` and add the following code:

```ts
#!/usr/bin/env script.js

app.meta('hello')

app.cmd('greetings', 'Say hello')
  .add('[...files]', 'Files', ['$files'])
  .add((files, ctx) => {
    $`ls -l ${files}`
  })
```

### 3. Run the script

You can use `<Tab>` to autocomplete arguments or options while using the script.

```sh
chmod +x hello         # Make the script executable
./hello                # First run to create completion file
./hello <Tab>          # Use Tab key for autocompletion
```

## Documentation

- [Create Commands](./docs/Create%20Commands.md): Create commands and subcommands
- [Completion](./docs/Completion.md): Customize the autocompletion
- [Global Commands](./docs/Global%20Commands.md): List of global variables and commands
- [Ake](./src/ake): A task runner supports shell autocompletion

## Thanks

- [Bun](https://github.com/oven-sh/bun): Incredibly fast JavaScript runtime, bundler, test runner, and package manager
- [Carapace](https://github.com/carapace-sh/carapace-bin): A multi-shell completion binary

## Contribute

We love contributions! Whether you're fixing bugs, adding features, or improving documentation, your involvement makes this project better.

1. Fork the Repository
2. Open a Pull Request on Github

---

Thank you for using Script.js! If you found it helpful, please ⭐️ star the project ️️⭐ on GitHub. If you have any questions, encounter issues, please refer to the documentation or report an issue on GitHub.

**Special Thanks to All Contributors:**

[![](https://contrib.rocks/image?repo=gutenye/script.js)](https://github.com/gutenye/script.js/graphs/contributors)

[⬆ Back to top ⬆](#readme)
