#!/usr/bin/env bun

import { next } from '@gutenye/script.js'

await next(Bun.argv.slice(2))
