import makeTransform, { getMeta } from '@events/transform';

import path from 'path';

import { setLogLevel, shouldLog, write } from './logger';
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

  return { config, ruleMeta, state, transform };
}

async function loop({ config, state, ruleMeta, transform }) {
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

  const distance = latestEvent.id - snapshotVersion;

  const projection$ = events$.map(e => ({
    event: e,
    projections: transform(e),
  }));

  if (shouldLog('DEBUG')) {
    events$.observe(e => {
      write('DEBUG', {
        type: 'incoming-event',
        payload: {
          event: e,
        },
      });
    });
    projection$.observe(ctx => {
      write('DEBUG', {
        type: 'incoming-projection',
        payload: ctx,
      });
    });
  }

  const persistence$ = getPersistenceStream(projection$);

  persistence$.observe(async out => {
    const { requests, changes } = out;
    const { event } = requests[requests.length - 1];
    const { event: firstEvent } = requests[0];
    const batch = [firstEvent.id, event.id];

    write('INFO', {
      type: 'persistence-complete',
      payload: { event, documents: changes, batch },
    });

    // if (!caughtup && event.id >= serverLatest) {
    //   caughtup = true;
    //   write('INFO', 'SUBSCRIPTION/CATCH_UP', {
    //     count: serverLatest - clientSnapshotVersion + 1,
    //     time: Date.now() - startTime,
    //   });
    // }

    // if (changes && sideEffectsPath) {
    //   const { successfulEffects, duration } = await applySideEffect(requests);
    //
    //   write('INFO', 'SIDE_EFFECTS/COMPLETE', { successfulEffects, duration });
    // }
  });
}

async function handleErrors(ex) {
  console.error(ex);
  console.error(ex.stack);
  process.exit(1);
}
