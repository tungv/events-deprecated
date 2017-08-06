#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk'
import pkg from '../../package.json'

const _prefix = 'events-server';

console.log(chalk.bold(`${pkg.name} stop v${pkg.version}`))

const input = process.argv[2];
const nameRegExp = new RegExp(`${_prefix}-${input}`);

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.list((err, lists) => {
    let filtered = 0; //flag for disconnect if no process name matched.

    lists.map((item) => item.name)
      .filter((processName, index, array) => array.indexOf(processName) === index && nameRegExp.test(processName))
      .forEach((name, index, appNameList) => {
        filtered++;
        pm2.delete(name, (err, apps) => {
          if (index === appNameList.length - 1) //disconnect when exec last process name
            pm2.disconnect(); // Disconnects from PM2

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

    if (!filtered) {
      console.log(`Process name not found or not matched the pattern '${inputName}.'`);
      pm2.disconnect(); // Disconnects from PM2
    }
  });
});