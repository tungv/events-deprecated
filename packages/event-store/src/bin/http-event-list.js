#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk'
import pkg from '../../package.json'
import parseInput from './parseInput';

console.log(chalk.bold(`${pkg.name} start v${pkg.version}`))

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.list((err, apps) => {
    pm2.disconnect();   // Disconnects from PM2

    if (err) {
      console.error(err);
    } else {
      // console.log('%s started', input.name)
      // console.log('running instance(s): %d', apps.length);

      console.log(require('util').inspect(apps, { depth: 2 }));
    }
  });
});
