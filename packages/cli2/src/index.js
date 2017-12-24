import prettyMs from 'pretty-ms';
import sade from 'sade';

import { version } from '../package.json';
import startCmd from './startCmd';

const prog = sade('heq');

prog
  .version(version)
  .option('--json', 'output logs in JSON format')
  .option(
    '--verbose',
    'level of log, from 0 (no log) to 10 (log everything)',
    2
  );

prog
  .command('start')
  .describe('start a new heq server')
  .option('-c, --config', 'Provide path to custom config', 'heq.config.js')
  .option(
    '--name',
    'assign a name for this server. This will override `name` in config file'
  )
  .option(
    '--port',
    'http servers will listen on this port. This will override `port` in config file'
  )
  .option(
    '--redis',
    'specify the backend redis or redis cluster connection string. This will override `redis` in config file'
  )
  .option(
    '--workers',
    'specify the number of http processes to start. This will override `workers` in config file'
  )
  .option(
    '-f, --force-overwrite',
    'if set, command line options will persist to the config file',
    false
  )
  .option('-D, --daemon', 'Run heq server in background', false)
  .example('start -c custom.js')
  .example('start -c custom.js --daemon')
  .action(startCmd);

const startAt = Date.now();
prog.parse(process.argv).then(
  () => {
    console.log('✨ done in', prettyMs(Date.now() - startAt));
  },
  err => {
    console.error(err);
  }
);
