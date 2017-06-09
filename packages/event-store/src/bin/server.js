#!/usr/bin/env node
/* @flow */
import program from 'commander';

import factory from '..';
import pkg from '../../package.json';

// [redis:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]

program
  .usage('[name] [options]. Eg: http-event MyDemoInstance -p 3000 -r localhost:6379/1')
  .version(pkg.version)
  .option(
    '-r, --redis [redis]',
    'redis config: example: redis://192.168.1.1:6379/1'
  )
  .option('-p, --port [port]', 'http server port. Defaults to 3000')
  .option('-T, --burst-time [time]', 'buffer time (in milliseconds) before emitting, defaults to 500ms')
  .option('-C, --burst-count [count]', 'buffer count before emitting, defaults to 20 events')
  .option('-v, --verbose', 'prints more log')
  .option('-x, --debug', 'enable debug mode')
  .parse(process.argv);

const name = program.args[0];
if (!name) {
  console.error('please speficy an instance name');
  process.exit();
}

if (!program.redis) {
  console.error('option --redis must be specified');
  process.exit();
}

program.port = program.port || 3000;

console.log('initializing server');
const server = factory({
  namespc: name,
  redis: program.redis,
  history: { size: 10 },
  burst: {
    time: program.burstTime || 500,
    count: program.burstCount || 20,
  },
  debug: program.debug,
});

console.log('starting event store on port', program.port);
console.log('instance namespace: %s', name);
server.listen(program.port);

console.log('server started');
