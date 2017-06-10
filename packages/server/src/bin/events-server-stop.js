#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk'
import pkg from '../../package.json'

console.log(chalk.bold(`${pkg.name} stop v${pkg.version}`))

const name = process.argv[2];

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.delete(`events-server-${name}`, (err, apps) => {
    pm2.disconnect();   // Disconnects from PM2

    if (err) {
      switch (err.message) {
        case 'process name not found':
          console.log('%s has not started', name);
          return;

        default:
          console.error(err);
          return;
      }

    } else {
      console.log('stopped %d instance(s) for %s', apps.length, name);
    }
  });
});
