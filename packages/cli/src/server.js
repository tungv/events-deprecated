#!/usr/bin/env node
/* @flow */
import factory from '@events/server';
import mri from 'mri';

const input = mri(process.argv.slice(2));

try {
  process.stdin.setRawMode(false);
} catch (ex) {
  // nothing
}

console.log('initializing server');
const server = factory({
  namespc: input.name,
  redis: { url: input.redis },
  history: { size: 10 },
  burst: {
    time: input.burstTime,
    count: input.burstCount,
  },
  debug: input.debug,
});

console.log('starting event store on port', input.port);
console.log('instance namespace: %s', input.name);
server.listen(input.port);

console.log('server started');
