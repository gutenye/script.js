# CLAUDE.md

## Project

`@gutenye/script.js` — Write shell scripts in JavaScript. A lightweight CLI framework and shell command execution tool built on Bun.

## Commands

```bash
bun test              # Run tests
bun run lint          # Lint and fix with Biome
bun run lint:ci       # CI lint with GitHub reporter
```

## Architecture

- **Runtime:** Bun (no Node.js — use Bun APIs exclusively)
- **Language:** TypeScript with strict mode, ESM only (`verbatimModuleSyntax`)
- **Entry:** `src/index.ts` exports `app` (Command) and `$` (shell execution). Registers `process.on('beforeExit')` to auto-run `app.run()` — user scripts no longer need `await app.run()`
- **CLI binary:** `src/script.ts` — sets globals on `globalThis`, imports user script (auto-run via `beforeExit`)
- **Ake task runner:** `src/ake.ts`, `src/akectl.ts` — built-in task runner using same Command framework

### Core modules

| File            | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `Command.ts`    | CLI command tree — subcommands, args, options, actions               |
| `Argument.ts`   | Positional arg parsing (`<required>`, `[optional]`, `[...variadic]`) |
| `Option.ts`     | Flag parsing (`-b \| --boolean`, `-s \| --string <value>`)           |
| `parseArgv.ts`  | Raw argv → positionals + options                                     |
| `spawn.ts`      | `$` tagged template for shell execution (`Bun.spawnSync` + `sh -c`)  |
| `completion.ts` | Carapace YAML spec generation from command tree                      |
| `helpers/`      | Utility functions — `table` (formatted console tables), `common` (exitWithError) |

### Path aliases

- `#/*` → `src/*`
- `#root/*` → `./*`

## Code Style

- **Formatter:** Biome — spaces, single quotes, no semicolons (ASI)
- **Linting:** Biome recommended rules, `noExplicitAny: off`, `noUselessElse: off`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.) — drives semantic-release
- **Comments:** Keep existing comments. Do not remove them during refactors.
- **Exports:** Use `export` directly, avoid `export default`
- **Imports:** Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`)

## Testing

- Framework: `bun:test` (`describe`, `test`, `expect`, `mock`)
- Location: `src/__tests__/<Module>.test.ts`
- Pattern: One test file per source module, grouped by method with `describe`/`test`
- No test utilities or custom matchers — plain `expect` assertions

## Releases

Automated via semantic-release on the `main` branch. Conventional commit messages determine version bumps. Do not manually edit version numbers.
