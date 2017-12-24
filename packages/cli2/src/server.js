#!/usr/bin/env node
/* @flow */
const factory = require('@events/server').default;

const args = process.argv[2];
const { port, name, redis, verbose } = JSON.parse(args);

const server = factory({
  namespc: name,
  redis: { url: redis },
  history: { size: 10 },
  debug: verbose > 4,
});

