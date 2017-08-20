#!/usr/bin/env node
/* @flow */
import program from 'commander';
import pkg from '../../package.json';

program
  .version(pkg.version)
  .command('start [name]', `start a new events server instance`)
  .command('stop [name]', `stop a running events server instance`)
  .command(
    'stop-interactive [pattern]',
    `display an interactive form for stopping apps. Adding optional pattern will filter the list of all apps`
  )
  .command('list', 'list all running instances')
  .parse(process.argv);
