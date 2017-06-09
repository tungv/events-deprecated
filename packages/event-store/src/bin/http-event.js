#!/usr/bin/env node
/* @flow */
import program from 'commander';
import pkg from '../../package.json';

program
  .version(pkg.version)
  .command('start [name]', `start a new ${pkg.name} instance`)
  .command('stop [name]', `stop a running ${pkg.name} instance`)
  .parse(process.argv);
