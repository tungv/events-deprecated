const parseConfig = require('./parseConfig');
const subscriber = require('@events/subscriber');

// FIXME: make transform package commonjs compatible
const makeTransform = require('@events/transform').default;

module.exports = async function subscribeThread(config, emit, end) {
  const {
    subscribe: { serverUrl, burstCount, burstTime },
    persist: { store, driver },
    transform: { rulePath },
  } = config;

  emit('DEBUG', 'CONFIG', { config });

  const rules = esmInteropImport(rulePath);

  const transform = makeTransform(rules);

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
  const clientSnapshotVersion = await version(config.persist);

  emit('INFO', 'SNAPSHOT/CONNECTED', { clientSnapshotVersion });

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

  p$.observe(({ event, projections, changes }) => {
    emit('INFO', 'PERSIST/WRITE', { event, documents: changes });
    if (!caughtup && event.id >= clientSnapshotVersion) {
      caughtup = true;
      emit('DEBUG', 'SUBSCRIPTION/CATCH_UP');
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
