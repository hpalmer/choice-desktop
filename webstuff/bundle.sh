#!/bin/bash
export PATH="`pwd`/node_modules/.bin:$PATH"
jspm unbundle
jspm bundle terminal/term.js terminal/scripts/term-bundle.js --minify --inject

