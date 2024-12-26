# script.js

> Write shell scripts in JavaScript

NOTE: KEEP THIS PRIVATE: contains private scripts, for code format, types, code completion

## Install

```
npm install -g @gutenye/script.js
```

## Write a script

```ts
#!/usr/bin/env gutenye-script.js

app.name('hello')

app.command('list [files...]')
  .action((files, options) => {
    ..
  })
```

## Completion

```
app.name('cli')

app.command('cmd1 <file>')
  .description('<file> Description')
  .option('--string <string>', '<string> Descripton')
  .completion({
    // they are saved to carapace spec
    completion: {
      flags: {
        option: ['value1']
      },
      positional: [
        null    // use null to skip ovewrite
        ['$files']
      ],
      positionalany: [],
    }
  }
}
```

# 🌟 Hello 🌟

> Easily transfer passwords from Bitwarden to Apple Passwords

[![Stars](https://img.shields.io/github/stars/gutenye/hello?style=social)](https://github.com/gutenye/hello) [![NPM Version](https://img.shields.io/npm/v/@gutenye/hello)](https://www.npmjs.com/package/@gutenye/hello) [![License](https://img.shields.io/github/license/gutenye/hello?color=blue)](https://github.com/gutenye/hello/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue)](https://github.com/gutenye/hello#-contribute)

**Kindly take a moment to follow the project’s author, [Guten Ye](https://github.com/gutenye) , and star the project to show your ❤️ and support.**

![Terminal](./assets/Terminal.png)

<details>
<summary>Click to view more screenshots</summary>

![BitwardenToApplePasswords](./assets/BitwardenToApplePasswords.png)

</details>

## 🌟 Features

- 📦 **Comprehensive Data Preservation**: Transfer everything including notes, custom fields, multiple URLs, and password history seamlessly.
- 🔗 **Multi-URL Handling:** Correctly handle items that contain multiple URLs.
- 📊 **In-Depth End Report:** Receive a detailed report and summary at the end.
- 🎯 **Selective Transfer:** Filter passwords by URL or count to transfer only the items you need.
- ⏱️ **Incremental Transfer:** Move passwords in batches at your convenience, with remaining passwords securely stored for future transfers until all are moved.
- 🔄 **Reverse Transfer (TODO):** Seamlessly transfer passwords from Apple Passwords back to Bitwarden, accurately setting custom fields, multiple URLs, and maintaining password history to ensure data integrity.


## 🚀 Getting Started

⚠ **Note:** Currently, only supports transferring data from Bitwarden to Apple Passwords.

### 1️⃣ Export Data

- Bitwarden: Follow [this official guide](https://bitwarden.com/help/export-your-data) to export your data in `.json (Encrypted)` format with `Password protected`.

## 🤝 Contribute

We welcome contributions from the community! Whether it’s reporting bugs, suggesting features, or submitting pull requests, your help is appreciated.

1. Fork the Repository
2. Create a Feature Branch: `git checkout -b feature/YourFeature`
3. Commit Your Changes: `git commit -m "Add some feature"`
4. Push to the Branch: `git push origin feature/YourFeature`
5. Open a Pull Request on Github

Please ensure your code follows our Code of Conduct and passes all tests.

---

Thank you for using Hello! 🔐 ✨ If you found it helpful, please ⭐️ star the project ️️⭐ on GitHub. If you have any questions or encounter issues, please refer to the documentation or report an issue on GitHub.

**Thanks to all the people who contribute:**

[![](https://contrib.rocks/image?repo=gutenye/hello)](https://github.com/gutenye/hello/graphs/contributors)

[⬆ Back to top ⬆](#readme)