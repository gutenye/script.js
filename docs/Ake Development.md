# Ake Development

1. Filename starts with `ake` like `ake`, `akefoo`, `ake.ts`, `akefoo.ts` — detected by `isAke()` and `getAkeSuffix()` in `src/ake/shared.ts`
2. Auto-generate `app.name` for completion — `#setupAke()` in `src/Command.ts` detects ake files and sets name to `ake<suffix>.<unique_name>` via `getCompletionName()`
3. Auto change working directory to project directory — `#setupAke()` calls `process.chdir(getProjectDir(scriptPath))`, supporting both local (`dirname`) and remote (reversed unique name) ake files
4. Upward directory search — `findAkeFiles()` in `src/ake/shared.ts` walks from CWD upward, checking both local and remote (`~/bin.src/ake/`) at each level
