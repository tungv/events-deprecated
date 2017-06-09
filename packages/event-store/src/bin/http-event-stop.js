#!/usr/bin/env node
/* @flow */
import pm2 from 'pm2';

import input from './parseInput';

pm2.connect(err => {
  if (err) {
    console.log(err);
    process.exit(2);
  }

  pm2.delete(`http-event-server-${input.name}`, (err, apps) => {
    pm2.disconnect();   // Disconnects from PM2

    if (err) {
      console.error(err);
    } else {
      console.log('stopped %d instance(s)', apps.length);
    }
  });
});
