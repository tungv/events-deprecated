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

  const rules = getRule(rulePath);

  const transform = makeTransform(rules);

  const { persist, version } = require(driver);

  // check snapshot version
  const clientSnapshotVersion = await version({ _: [store] });
  emit('INFO', 'SNAPSHOT/CONNECTED', { clientSnapshotVersion });

  // check server version
  const serverLatest = await getLatest(serverUrl);
  if (!serverLatest) {
    emit('ERROR', 'SERVER/DISCONNECTED');
    end();
    return;
  }

  emit('INFO', 'SERVER/CONNECTED', { serverLatest });

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

  const projection$ = events$.map(transform);

  projection$.observe(p => {
    emit('DEBUG', 'TRANSFORM/PROJECTION', { projection: p });
  });

  const p$ = await persist({ _: [store] }, projection$);

  p$.observe(({ __v, changes }) => {
    console.log('__v', __v);
    console.log('changes', changes);
    emit('INFO', 'PERSIST/WRITE', { __v, documents: changes });
    if (!caughtup && __v >= clientSnapshotVersion) {
      caughtup = true;
      emit('DEBUG', 'SUBSCRIPTION/CATCH_UP');
    }
  });

  await firstRespPromise;
};

async function getLatest(url) {
  const request = require('request-promise');
  try {
    const resp = await request(`${url}/events/latest`, { json: true });
    return resp.id;
  } catch (ex) {
    return null;
  }
}

function getRule(rulePath) {
  const rules = require(rulePath);

  return rules.default || rules;
}
