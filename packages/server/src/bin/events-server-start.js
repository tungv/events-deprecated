#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk';
import path from 'path';
import pkg from '../../package.json';
import parseInput from './parseInput';

console.log(chalk.bold(`${pkg.name} start v${pkg.version}`));

const { name, workers, daemon } = parseInput();

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.start(
    {
      script: path.resolve(__dirname, './server.js'),
      name: `events-server-${name}`,
      args: process.argv.slice(2),
      exec_mode: 'cluster',
      instances: workers || 0,
      max_memory_restart: '100M',
    },
    (err, apps) => {
      if (err) {
        console.error(err);
      } else {
        console.log('%s started', name);
        console.log('running instance(s): %d', apps.length);
      }

      if (daemon) {
        pm2.disconnect(); // Disconnects from PM2
        return;
      }

      // keep process running
      console.log('daemon mode: CTRL-C to terminate');
      process.on('SIGINT', () => {
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
      })
    }
  );
});
