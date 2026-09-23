#!/usr/bin/env node
// Compiles ink/story.ink (pulling in any INCLUDEd .ink files under ink/)
// to data/story.json, using inkjs's own pure-JS compiler — no inklecate,
// no .NET. Run via `npm run compile:ink`; the GitHub Action in
// .github/workflows/compile-ink.yml runs this same script and commits the
// result. See AGENTS.md's "The cutscene system" for why data/story.json
// is generated, not hand-edited.
'use strict';

const fs = require('fs');
const path = require('path');
const inkjsFull = require('inkjs/full');
const { PosixFileHandler } = require('inkjs/compiler/FileHandler/PosixFileHandler');

const INK_DIR = path.join(__dirname, '..', 'ink');
const ENTRY = path.join(INK_DIR, 'story.ink');
const OUT = path.join(__dirname, '..', 'data', 'story.json');

const source = fs.readFileSync(ENTRY, 'utf8');
const fileHandler = new PosixFileHandler(INK_DIR + path.sep);

// inkjs's ErrorType enum (engine/Error.ts): Author = 0, Warning = 1, Error = 2 —
// verified directly against the installed package rather than assumed, since
// guessing wrong here means a real compile error silently produces bad JSON.
const ERROR_TYPE_LABELS = ['AUTHOR NOTE', 'WARNING', 'ERROR'];
const FATAL_ERROR_TYPE = 2;

let hasFatalError = false;
const compiler = new inkjsFull.Compiler(source, {
  fileHandler,
  errorHandler: (message, errorType) => {
    console.error(`[ink ${ERROR_TYPE_LABELS[errorType] || errorType}] ${message}`);
    if (errorType === FATAL_ERROR_TYPE) hasFatalError = true;
  },
});

// On a fatal error, Compile() itself throws (building its internal runtime
// story fails) rather than just relying on errorHandler + a return value —
// catch that so a bad .ink file exits cleanly on our own message above,
// not an inkjs-internal stack trace.
let compiled;
try {
  compiled = compiler.Compile();
} catch (err) {
  if (!hasFatalError) throw err; // a real bug in this script, not an authoring error — don't swallow it
}

if (hasFatalError) {
  console.error(`\nCompile failed — ${ENTRY} has errors, see above. data/story.json NOT written.`);
  process.exit(1);
}

fs.writeFileSync(OUT, compiled.ToJson());
console.log(`Compiled ${path.relative(process.cwd(), ENTRY)} -> ${path.relative(process.cwd(), OUT)}`);
