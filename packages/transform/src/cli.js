#!/usr/bin/env node
import mri from 'mri';

import path from 'path';

import makeTransform from './index';
import observeStdin from './observeStdin';

const args = mri(process.argv.slice(2));

const entry = args._[0];

const cwd = args.cwd || process.cwd();

const resolvedEntry = path.resolve(cwd, entry);

const rules = require(resolvedEntry);

// compatible with es6 export default
const transform = makeTransform(rules.default || rules);

observeStdin(process.stdin)
  .map(transform)
  .onValue(json => console.log(JSON.stringify(json)))
  .onEnd(process.exit.bind(1));
