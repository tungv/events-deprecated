#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk';
import path from 'path';
import pkg from '../../package.json';
import parseInput from './parseInput';

console.log(chalk.bold(`${pkg.name} start v${pkg.version}`));

const input = parseInput();

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.start(
    {
      script: path.resolve(__dirname, './server.js'),
      name: `events-server-${input.name}`,
      args: process.argv.slice(2),
      exec_mode: 'cluster',
      instances: input.workers || 0,
      max_memory_restart: '100M',
    },
    (err, apps) => {
      pm2.disconnect(); // Disconnects from PM2

      if (err) {
        console.error(err);
      } else {
        console.log('%s started', input.name);
        console.log('running instance(s): %d', apps.length);
      }
    }
  );
});
