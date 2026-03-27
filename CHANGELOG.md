## [2.14.0](https://github.com/gutenye/script.js/compare/v2.13.1...v2.14.0) (2026-03-27)

### Features

* preserve declaration order in help output ([460b77b](https://github.com/gutenye/script.js/commit/460b77ba7c9fae39f5ed415137d48d6ab156ecd9))

## [2.13.1](https://github.com/gutenye/script.js/compare/v2.13.0...v2.13.1) (2026-03-27)

### Bug Fixes

* show parent command in help when it has description or action ([c5101ab](https://github.com/gutenye/script.js/commit/c5101ab479ec7c443b7b27d3c6f6eff4b69d095d))

## [2.13.0](https://github.com/gutenye/script.js/compare/v2.12.0...v2.13.0) (2026-03-24)

### Features

* add $.global shell preamble for aliases and functions ([1373ced](https://github.com/gutenye/script.js/commit/1373cedd0bcfb15cb12c8035f77c1fcba7aafec1))

## [2.12.0](https://github.com/gutenye/script.js/compare/v2.11.0...v2.12.0) (2026-03-24)

### Features

* flatten nested subcommands in help text ([93176aa](https://github.com/gutenye/script.js/commit/93176aa4f8c1cf9797f9d1f11b43832d642d919d))

## [2.11.0](https://github.com/gutenye/script.js/compare/v2.10.1...v2.11.0) (2026-03-24)

### Features

* support space-separated names in cmd() for nested subcommands ([e78a9f0](https://github.com/gutenye/script.js/commit/e78a9f07186773053aab4a4688158fffc4492748))

## [2.11.0] (2026-03-24)

### Features

* support space-separated names in cmd() for creating nested subcommands (`app.cmd('hello world')`)

## [2.10.1](https://github.com/gutenye/script.js/compare/v2.10.0...v2.10.1) (2026-03-24)

### Bug Fixes

* **ake:** resolve symlinks in PWD for fish completion cache key ([6a71734](https://github.com/gutenye/script.js/commit/6a717340bbb62f84874af7bb665c9e62f705a9e3))

## [2.10.0](https://github.com/gutenye/script.js/compare/v2.9.1...v2.10.0) (2026-03-20)

### Features

* **ake:** add --ci flag and creation log to akectl init ([6643128](https://github.com/gutenye/script.js/commit/6643128213d026df1899bcbcc85d03dfed43198a))

## [2.9.1](https://github.com/gutenye/script.js/compare/v2.9.0...v2.9.1) (2026-03-06)

### Bug Fixes

* handle key\tdescription format in choices validation ([5b4ba97](https://github.com/gutenye/script.js/commit/5b4ba97f6ea5af274b886f366e285690476ae379))

## [2.9.0](https://github.com/gutenye/script.js/compare/v2.8.0...v2.9.0) (2026-03-04)

### Features

* export Options<T> type for typed option bags ([4b97dca](https://github.com/gutenye/script.js/commit/4b97dcae6d6a004e016b1e0f070dc910936a55f4))

## [2.8.0](https://github.com/gutenye/script.js/compare/v2.7.4...v2.8.0) (2026-03-04)

### Features

* add options.$has() to check if an option was explicitly provided ([c962ee0](https://github.com/gutenye/script.js/commit/c962ee0bc4466d60692faa3762dd5d9b08102236))

## [2.7.4](https://github.com/gutenye/script.js/compare/v2.7.3...v2.7.4) (2026-03-04)

### Bug Fixes

* **completion:** always use = for flags with completions ([a89cac7](https://github.com/gutenye/script.js/commit/a89cac79c656fc2244ca6d7fb271a61d15abe125))

## [2.7.3](https://github.com/gutenye/script.js/compare/v2.7.2...v2.7.3) (2026-03-04)

### Bug Fixes

* **ake:** default suffix to empty string in fish completion ([a73dab0](https://github.com/gutenye/script.js/commit/a73dab0ffab4763f9a5cd56e089340073eb567a5))
* **completion:** mark boolean flags as value flags when completions are provided ([dd2c0f4](https://github.com/gutenye/script.js/commit/dd2c0f4818a37a51106a2f9146205e64eb06c614))

## [2.7.2](https://github.com/gutenye/script.js/compare/v2.7.1...v2.7.2) (2026-03-04)

### Bug Fixes

* add never return type to exitWithError ([045d8ca](https://github.com/gutenye/script.js/commit/045d8caede25725df95c9369fa31ba333ba0bc8b))

## [2.7.1](https://github.com/gutenye/script.js/compare/v2.7.0...v2.7.1) (2026-03-04)

### Bug Fixes

* add leading newline to exitWithError message ([5ee1ebb](https://github.com/gutenye/script.js/commit/5ee1ebb5b895ff641724fb6067743d2ce473d66c))

## [2.7.0](https://github.com/gutenye/script.js/compare/v2.6.1...v2.7.0) (2026-03-04)

### Features

* add exitWithError helper and update migration doc ([513d2dc](https://github.com/gutenye/script.js/commit/513d2dc8f5ceceb69aa90095317dce1821360c02))

## [2.6.1](https://github.com/gutenye/script.js/compare/v2.6.0...v2.6.1) (2026-03-04)

### Bug Fixes

* use inline default value when optional flag is present without value ([d4cabcb](https://github.com/gutenye/script.js/commit/d4cabcb855eddd8b6bcfda11ccb7b55d6dc63690))

## [2.6.0](https://github.com/gutenye/script.js/compare/v2.5.0...v2.6.0) (2026-03-03)

### Features

* **completion:** log when spec file is updated ([5ca68c4](https://github.com/gutenye/script.js/commit/5ca68c4d1a71834d63d959c678f5a48de346549f))

## [2.5.0](https://github.com/gutenye/script.js/compare/v2.4.0...v2.5.0) (2026-03-03)

### Features

* **ake:** add install-bin command and SUFFIX env var support ([7f25ab4](https://github.com/gutenye/script.js/commit/7f25ab4ca57a91138077f996b2f1db0e60a8992a))

## [2.4.0](https://github.com/gutenye/script.js/compare/v2.3.0...v2.4.0) (2026-03-03)

### Features

* support multiple ake files with arbitrary suffixes (akefoo, akea, etc.) ([9ae45de](https://github.com/gutenye/script.js/commit/9ae45deea75c1d0a0026aa5b755e68f01d01f90d))

## [2.3.0](https://github.com/gutenye/script.js/compare/v2.2.0...v2.3.0) (2026-03-02)

### Features

* support inline default values in option syntax `[value=default]` ([bcb4d5d](https://github.com/gutenye/script.js/commit/bcb4d5d2d363d14a5533e384dc62411f8fd9ee03))

## [2.2.0](https://github.com/gutenye/script.js/compare/v2.1.0...v2.2.0) (2026-03-01)

### Features

* support ake.ts as an ake filename ([fcd0fb4](https://github.com/gutenye/script.js/commit/fcd0fb4882dd6c447a66c7aa7b1c0b2ed3bc75fa))

## [2.1.0](https://github.com/gutenye/script.js/compare/v2.0.0...v2.1.0) (2026-03-01)

### Features

* validate required arguments and error on missing values ([9dfdf58](https://github.com/gutenye/script.js/commit/9dfdf588bcad073fd2e24193a890f80491a896b9))

## [2.0.0](https://github.com/gutenye/script.js/compare/v1.0.1...v2.0.0) (2026-03-01)

### ⚠ BREAKING CHANGES

* Complete rewrite with new API. See docs/Migration.md.

Made-with: Cursor

### Features

* add ake support ([#1](https://github.com/gutenye/script.js/issues/1)) ([e0e8be8](https://github.com/gutenye/script.js/commit/e0e8be85bdfb853d15a7492e2ee5693d66094ca5))
* support both script.js shebang and direct import usage ([d88478e](https://github.com/gutenye/script.js/commit/d88478e1c2b3408a054fc160fa671d89cfee5b4a))
* v2 rewrite — remove v1 dependencies ([da21c0e](https://github.com/gutenye/script.js/commit/da21c0eb008b3a222d18346b003b92aecfdcebfb))

## [1.0.1](https://github.com/gutenye/script.js/compare/v1.0.0...v1.0.1) (2025-09-17)

### Bug Fixes

* rename to script.js ([24fb251](https://github.com/gutenye/script.js/commit/24fb251fe2bceaacaf9546359d80cac507237671))

## 1.0.0 (2024-12-26)

### Bug Fixes

* import path ([9249912](https://github.com/gutenye/script.js/commit/924991212fa64d6b536e272065bbf62353fae868))
