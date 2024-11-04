#!/usr/bin/env zx

// Spawn
import { $$, $l, $t } from './spawn.js'
globalThis.$$ = $$
globalThis.$t = $t
globalThis.$l = $l

// Colors
import colors from 'chalk'
globalThis.colors = colors

// Lodash
import _ from 'lodash-es'
globalThis._ = _

// Table
import { displayTable } from './table.js'
globalThis.displayTable = displayTable

// Csv
import { csv } from './csv.js'
globalThis.csv = csv

import { exitError } from './exit.js'
globalThis.exitError = exitError

import { app, start } from './app.js'
globalThis.app = app
start()
