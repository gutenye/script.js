# 🧩 Script.js 🧩

**Write shell scripts in JavaScript** and leverage the power of JavaScript’s simplicity and flexibility to make your shell scripting easier and faster. Why struggle with the complexity of Bash or other shell scripting languages when you already know JavaScript? Script.js allows you to write and run complex shell scripts using JavaScript, saving you time and reducing errors.

**Show your ❤️ and support by starring this project and following the author, [Guten Ye](https://github.com/gutenye)!**

[![Stars](https://img.shields.io/github/stars/gutenye/script.js?style=social)](https://github.com/gutenye/script.js) [![NPM Version](https://img.shields.io/npm/v/@gutenye/script.js)](https://www.npmjs.com/package/@gutenye/script.js) [![License](https://img.shields.io/github/license/gutenye/script.js?color=blue)](https://github.com/gutenye/script.js/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)](https://github.com/gutenye/script.js#-contribute)

## 🌟 Features

- **Fast to write**: The most important factor in script writing is **speed**. With Script.js, you can quickly open the editor, write a few lines of code, and run it instantly. Thanks to global commands, you don’t need to worry about import statements, and more. Writing a script is enjoyable and efficient.
- **Fun to run**: A major benefit of using a script is **autocompletion**. Script.js includes built-in autocompletion support. Running a script is fun and seamless.
- **JavaScript Power**: Writing complex scripts in JavaScript and access the entire JavaScript ecosystem.
- **Familiar Syntax**: Write your shell commands just like you would in Bash, with full support for redirection, pipes, environment variables, and more.
- **Subcommands**: Create and organize subcommands effortlessly.
- **Help Documentation**: Auto-generate command help documentation for better user experience.
- **Fast Execution**: Fast to execute your scripts.

## 🚀 Getting Started

### 1️⃣ Install

First, make sure [Bun](https://bun.sh) and [Carapace](https://github.com/carapace-sh/carapace-bin) are installed.

To install Script.js, run:

```sh
npm install -g @gutenye/script.js
```

### 2️⃣ Write Your First Script

Create a file named `hello.js` and add the following code:

```ts
#!/usr/bin/env script.js

app
  .name('hello.js')
  .enableCompletion()

app.command('greetings [files...]')
  .completion({
    positionalany: ['$files'],
  })
  .action((files, options) => {
    $`
      ls -l ${files}
      echo ${files} | wc -l
    `
  })
```

### 3️⃣ Run the script

You can use `<Tab>` to autocomplete arguments or options while using the script.

```sh
chmod +x hello.js   # Make the script executable
./hello.js          # First run to create completion file
./hello.js <Tab>    # Use Tab key for autocompletion
```

## 📖 Documentation

- [Create Commands](./docs/Create%20Commands.md): Create commands and subcommands
- [Completion](./docs/Completion.md): Customize the autocompletion
- [Global Commands](./docs/Global%20Commands.md): List of global variables and commands
- [Ake](./src/ake): Run script in any directory with autocompletion support

## 🙇 Thanks

- [Bun](https://github.com/oven-sh/bun): Incredibly fast JavaScript runtime, bundler, test runner, and package manager – all in one
- [Carapace](https://github.com/carapace-sh/carapace-bin): A multi-shell completion binary
- [Zurk](https://github.com/webpod/zurk): A generic process spawner
- [Zx](https://github.com/google/zx): A tool for writing better scripts
- [Commander.js](https://github.com/tj/commander.js): node.js command-line interfaces made easy

## 🤝 Contribute

We love contributions! Whether you’re fixing bugs, adding features, or improving documentation, your involvement makes this project better.

**How to Contribute:**

1. Fork the Repository
2. Open a Pull Request on Github

---

Thank you for using Script.js! If you found it helpful, please ⭐️ star the project ️️⭐ on GitHub. If you have any questions, encounter issues, please refer to the documentation or report an issue on GitHub.

**Special Thanks to All Contributors:**

[![](https://contrib.rocks/image?repo=gutenye/script.js)](https://github.com/gutenye/script.js/graphs/contributors)

[⬆ Back to top ⬆](#readme)
