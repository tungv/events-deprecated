#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';

import input from './parseInput';

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.start({
    script: './build/bin/server.js',
    name: `http-event-server-${input.name}`,
    args: process.argv,
    exec_mode: 'cluster',
    instances: input.workers || 0,
    max_memory_restart: '100M'
  }, (err, apps) => {
    pm2.disconnect();   // Disconnects from PM2

    if (err) {
      console.error(err);
    } else {
      console.log('running instance(s): %d', apps.length);
    }
  });
});
