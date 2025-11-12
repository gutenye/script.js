#!/usr/bin/env bun

import 'zx/globals'

// Variables
globalThis.HOME = os.homedir()
globalThis.CWD = process.cwd()
globalThis.ENV = process.env

// App
import { app, start } from './app'
globalThis.app = app

// Mixins
import { mixins } from './mixins'
globalThis.mixins = mixins

// Spawn
import { $, $l, $t } from './spawn'
globalThis.$ = $
globalThis.$t = $t
globalThis.$l = $l

// Error
import { exitWithError } from './exit'
globalThis.exitWithError = exitWithError

// Filesystem
import { fs, cp, ls, mkdir, mv, nodePath, rm } from './fileSystem'
globalThis.fs = fs
globalThis.nodePath = nodePath
globalThis.cp = cp
globalThis.mv = mv
globalThis.rm = rm
globalThis.mkdir = mkdir
globalThis.ls = ls

// Lodash
import _ from 'lodash-es'
globalThis._ = _

// UI
import * as ui from './ui'
globalThis.ui = ui
import colors from 'chalk'
globalThis.colors = colors

// Csv
import * as csv from './csv'
globalThis.csv = csv

import * as yaml from './yaml'
globalThis.yaml = yaml

start()
