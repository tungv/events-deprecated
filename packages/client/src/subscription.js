const { watch } = require('chokidar');
const debounce = require('debounce');
const subscriber = require('@events/subscriber');
const path = require('path');

// FIXME: make transform package commonjs compatible
const makeTransform = require('@events/transform').default;
const { getMeta } = require('@events/transform');

const parseConfig = require('./parseConfig');
const makeSideEffects = require('./makeSideEffects');

const noop = () => {};

module.exports = async function subscribeThread(config, emit, end) {
  const {
    subscribe: { serverUrl, burstCount, burstTime },
    persist: { store, driver },
    transform: { rulePath },
    sideEffects: { sideEffectsPath },
    hotReload: { watchPaths },
  } = config;

  emit('DEBUG', 'CONFIG', { config });

  const rules = esmInteropImport(rulePath);
  const aggreateNameAndPVs = getMeta(rules);

  const transform = makeTransform(rules);

  // using let because applySideEffect may be hot reloaded
  let applySideEffect = sideEffectsPath
    ? makeSideEffects(esmInteropImport(sideEffectsPath), emit)
    : noop;

  if (watchPaths && sideEffectsPath) {
    const watchConfig = {
      ignoreInitial: true,
      ignored: [
        /\.git|node_modules|\.nyc_output|\.sass-cache|coverage/,
        /\.swp$/,
      ],
    };
    const watcher = watch(watchPaths, watchConfig);

    emit('INFO', 'SIDE_EFFECTS/HOT_RELOAD_ENABLED', { watchPaths });

    watcher.on(
      'all',
      debounce((event, filePath) => {
        const location = path.relative(process.cwd(), filePath);

        emit('INFO', 'SIDE_EFFECTS/FILE_CHANGED', { location });

        // clear cache
        clearRequireCache(watcher);

        // patch
        applySideEffect = makeSideEffects(esmInteropImport(sideEffectsPath));
        emit('INFO', 'SIDE_EFFECTS/RELOADED', { location });
      }, 300)
    );
  }

  const { persist, version } = require(driver);
  // check server version
  const latestEvent = await getLatest(serverUrl);
  if (!latestEvent) {
    emit('ERROR', 'SERVER/DISCONNECTED');
    end();
    return;
  }

  emit('INFO', 'SERVER/CONNECTED', { latestEvent });
  const serverLatest = latestEvent.id;

  // check snapshot version
  const snapshotVersions = await version(config.persist, aggreateNameAndPVs);

  const { snapshotVersion: clientSnapshotVersion } = snapshotVersions;

  emit('INFO', 'SNAPSHOT/CONNECTED', snapshotVersions);

  let caughtup = false;
  if (serverLatest === clientSnapshotVersion) {
    caughtup = true;
    emit('DEBUG', 'SUBSCRIPTION/CATCH_UP');
  }

  const { raw$, events$, abort } = subscriber(`${serverUrl}/subscribe`, {
    'Last-Event-ID': clientSnapshotVersion,
    'burst-count': burstCount,
    'burst-time': burstTime,
  });

  const firstRespPromise = raw$.take(1).toPromise();

  raw$.onEnd(end);

  events$.observe(e => {
    emit('DEBUG', 'SERVER/INCOMING_EVENT', { event: e });
  });

  const projection$ = events$.map(e => ({
    event: e,
    projections: transform(e),
  }));

  projection$.observe(ctx => {
    emit('DEBUG', 'TRANSFORM/PROJECTION', ctx);
  });

  const p$ = await persist({ _: [store] }, projection$);

  p$.observe(async out => {
    const { requests, changes } = out;
    const { event } = requests[requests.length - 1];
    const { event: firstEvent } = requests[0];
    const batch = [firstEvent.id, event.id];

    emit('INFO', 'PERSIST/WRITE', { event, documents: changes, batch });

    if (!caughtup && event.id >= serverLatest) {
      caughtup = true;
      emit('DEBUG', 'SUBSCRIPTION/CATCH_UP');
    }

    if (changes && sideEffectsPath) {
      const { successfulEffects, duration } = await applySideEffect(requests);

      emit('INFO', 'SIDE_EFFECTS/COMPLETE', { successfulEffects, duration });
    }
  });

  await firstRespPromise;
};

async function getLatest(url) {
  const request = require('request-promise');
  try {
    return await request(`${url}/events/latest`, { json: true });
  } catch (ex) {
    return null;
  }
}

function esmInteropImport(rulePath) {
  const rules = require(rulePath);

  return rules.default || rules;
}

function clearRequireCache(watcher) {
  const watched = watcher.getWatched();
  const toDelete = [];

  for (const mainPath in watched) {
    if (!{}.hasOwnProperty.call(watched, mainPath)) {
      continue;
    }

    const subPaths = watched[mainPath];

    for (const subPath of subPaths) {
      const full = path.join(mainPath, subPath);
      toDelete.push(full);
    }

    // Remove file that changed from the `require` cache
    for (const item of toDelete) {
      let location;

      try {
        location = require.resolve(item);
      } catch (err) {
        continue;
      }

      delete require.cache[location];
    }
  }
}
