#!/usr/bin/env node
import mri from 'mri';

import path from 'path';
import { name, version } from '../package.json';

import makeTransform from './index';
import readJSONFromStdin from 'kefir-stdin-json';

const args = mri(process.argv.slice(2), { alias: { x: 'debug' } });

const entry = args._[0];

const cwd = args.cwd || process.cwd();

const resolvedEntry = path.resolve(cwd, entry);

const rules = require(resolvedEntry);

// compatible with es6 export default
const transform = makeTransform(rules.default || rules);

const write = args.debug ? str => console.error('[TRANSFORM] ', str) : () => {};

write(`${name} version ${version}`);

process.on('SIGINT', () => {
  write('INTERUPTED');
  process.exit(0);
});

readJSONFromStdin(process.stdin)
  .map(transform)
  .onValue(json => console.log(JSON.stringify(json)))
  .onEnd(process.exit.bind(1));
