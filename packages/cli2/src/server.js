#!/usr/bin/env node
/* @flow */
import prettyLog from './prettyLog';

const factory = require('@events/server').default;
const { init } = require('./logger');
const { default: LOG_LEVEL } = require('./logLevels');

const args = process.argv[2];

const { port, name, redis, verbose } = JSON.parse(args);

const log = init(verbose);

log(LOG_LEVEL.DEBUG, {
  type: 'child-process-param',
  payload: { args },
});

log(LOG_LEVEL.INFO, {
  type: 'before-app-start',
  payload: {
    port,
    name,
    redis,
    verbose,
  },
});

const server = factory({
  namespc: name,
  redis: { url: redis },
  history: { size: 10 },
  debug: verbose > 4,
});

server.listen(port, () => {
  log(LOG_LEVEL.INFO, {
    type: 'app-started',
    payload: {},
  });
});
