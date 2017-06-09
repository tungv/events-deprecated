#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';
import chalk from 'chalk';
import pkg from '../../package.json';
import parseInput from './parseInput';
import Table from 'cli-table2';
import prettyBytes from 'pretty-bytes';
import prettyMs from 'pretty-ms';
import { pick, forEach, map, toArray, flow, filter, groupBy } from 'lodash/fp';

console.log(chalk.bold(`${pkg.name} list v${pkg.version}`));

const print = flow(
  filter(p => p.name.startsWith('http-event-server-')),
  groupBy(p => p.name),
  toArray,
  forEach(processes => {
    const name = processes[0].name;
    const t = new Table({
      head: ['pid', 'uptime', 'ram', 'cpu'],
      style: {
        compact: true,
        head: ['green'],
        'padding-left': 2,
        'padding-right': 2,
      },
    });

    processes.forEach(p => {
      t.push([
        p.pid,
        prettyMs(Date.now() - p.pm2_env.created_at),
        prettyBytes(p.monit.memory),
        p.monit.cpu,
      ]);
    });

    console.log(chalk.bold.green(`\nname: ${name}`));
    console.log(t.toString());
  })
);

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.list((err, apps) => {
    pm2.disconnect(); // Disconnects from PM2

    if (err) {
      console.error(err);
    } else {
      print(apps);
    }
  });
});
