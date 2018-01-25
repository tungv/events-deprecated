#!/usr/bin/env node

import sade from 'sade';

import { version } from '../package.json';
import subscribeCommand from './subscribeCommand';

const program = sade('heq-client');

program
  .version(version)
  .option('--json', 'output logs in JSON format', false)
  .option(
    '--verbose, -x',
    'level of log, from 0 (no log) to 10 (log everything)',
    'INFO',
  );

program
  .command('subscribe', '', {
    default: true,
  })
  .describe(
    'start to subscribe to an heq server and persist data to a datastore',
  )
  .option('--config, -c', 'path to config file', 'events.config.js')
  .example('subscribe --config path/to/config.js')
  .action(subscribeCommand);

program.parse(process.argv);
