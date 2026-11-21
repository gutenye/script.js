#!/usr/bin/env bun --env-file ''

import { runNext } from './pagination'

await runNext(Bun.argv.slice(2))
