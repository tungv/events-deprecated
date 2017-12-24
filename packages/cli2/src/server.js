#!/usr/bin/env node
/* @flow */
const factory = require('@events/server').default;
const { default: makeLogger, LOG_LEVEL } = require('./logger');

const args = process.argv[2];

const { port, name, redis, verbose } = JSON.parse(args);

const log = makeLogger(verbose);

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
