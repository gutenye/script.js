#!/usr/bin/env bun

import 'zx/globals'

// Variables
globalThis.HOME = os.homedir()
globalThis.PWD = process.cwd()
globalThis.ENV = process.env

// App
import { app, start } from './app.js'
globalThis.app = app

// Mixins
import { mixins } from './mixins.js'
globalThis.mixins = mixins

// Spawn
import { $, $l, $t } from './spawn.js'
globalThis.$ = $
globalThis.$t = $t
globalThis.$l = $l

// Error
import { exitWithError } from './exit.js'
globalThis.exitWithError = exitWithError

globalThis.mixins = mixins

// Filesystem
import { fs, cp, ls, mkdir, mv, rm } from './fileSystem.js'
globalThis.fs = fs
globalThis.cp = cp
globalThis.mv = mv
globalThis.rm = rm
globalThis.mkdir = mkdir
globalThis.ls = ls

// Lodash
import _ from 'lodash-es'
globalThis._ = _

// UI
import * as ui from './ui/index.js'
globalThis.ui = ui
import colors from 'chalk'
globalThis.colors = colors

// Csv
import * as csv from './csv.js'
globalThis.csv = csv

start()
