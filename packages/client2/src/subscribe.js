import makeTransform, { getMeta } from '@events/transform';

import path from 'path';

import { setLogLevel, write } from './logger';
import connectSnapshot from './connectSnapshot';
import getEventsStream from './getEventsStream';
import loadModule from './utils/loadModule';
import parseConfig from './utils/parseConfig';

const { params } = process.env;

const { json, verbose, configPath } = JSON.parse(params);

setLogLevel(verbose);

process.on('exit', code => {
  write('INFO', {
    type: 'process-exit',
    payload: {
      code,
    },
  });
});

process.on('SIGINT', () => {
  write('INFO', {
    type: 'process-interrupted',
  });
  process.exit(0);
});

prepare()
  .then(loop)
  .catch(handleErrors);

async function prepare() {
  write('INFO', {
    type: 'load-config-begin',
    payload: {
      path: configPath,
    },
  });

  const configDir = path.resolve(configPath, '..');
  const config = await parseConfig(require(configPath), configDir);

  write('DEBUG', {
    type: 'load-config-end',
    payload: {
      config,
    },
  });

  const { transform: { rulePath } } = config;

  write('DEBUG', {
    type: 'load-transform-begin',
    payload: {
      rulePath,
    },
  });

  const rules = loadModule(rulePath);

  const transform = makeTransform(rules);
  const ruleMeta = getMeta(rules);

  write('DEBUG', {
    type: 'load-transform-end',
    payload: {
      ruleMeta,
    },
  });

  const state = {
    retryCount: 0,
  };

  return { config, ruleMeta, state };
}

async function loop({ config, state, ruleMeta }) {
  const persistenceConfig = config.persist;

  write('DEBUG', {
    type: 'connect-snapshot-begin',
    payload: {
      persistenceConfig,
    },
  });

  const { snapshotVersion, getPersistenceStream } = await connectSnapshot({
    persistenceConfig,
    ruleMeta,
  });

  write('INFO', {
    type: 'connect-snapshot-end',
    payload: {
      snapshotVersion,
    },
  });

  write('DEBUG', {
    type: 'connect-events-begin',
    payload: {
      retryCount: state.retryCount,
      snapshotVersion,
    },
  });

  const { latestEvent, ready, events$ } = await getEventsStream({
    subscriptionConfig: config.subscribe,
    from: snapshotVersion,
  });

  write('INFO', {
    type: 'connect-events-end',
    payload: {
      serverLatest: latestEvent.id,
    },
  });
}

async function handleErrors(ex) {
  console.error(ex);
  console.error(ex.stack);
  process.exit(1);
}
