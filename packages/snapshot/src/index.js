#!/usr/bin/env node
const mri = require('mri');
const noop = () => {};

const input = mri(process.argv.slice(2), { alias: { x: 'debug' } });

const cmd = input._.shift();

const write = input.debug ? str => console.error('[SNAPSHOT] ', str) : noop;

try {
  const program = require(`./${cmd}`);
  program(input, write).catch(process.exit.bind(1));
} catch (ex) {
  write(`unknown command ${cmd}`);
}

process.on('SIGINT', () => {
  write('INTERUPTED');
  process.exit(0);
});
