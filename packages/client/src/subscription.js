const parseConfig = require('./parseConfig');
const subscriber = require('@events/subscriber');

module.exports = async function subscribeThread(config, emit, end) {
  const {
    subscribe: { serverUrl, burstCount, burstTime },
    persist: { store, driver },
  } = config;

  emit('DEBUG', 'CONFIG', { config });

  const { persist, version } = require(driver);

  // check snapshot version
  const clientSnapshotVersion = await version({ _: [store] });
  emit('INFO', 'SNAPSHOT/CONNECTED', { clientSnapshotVersion });

  // check server version
  const serverLatest = await getLatest(serverUrl);
  emit('INFO', 'SERVER/CONNECTED', { serverLatest });

  const { raw$, events$, abort } = subscriber(`${serverUrl}/subscribe`, {
    'Last-Event-ID': clientSnapshotVersion,
    'burst-count': burstCount,
    'burst-time': burstTime,
  });

  const firstRespPromise = raw$.take(1).toPromise();

  await firstRespPromise;

  end();
};

async function getLatest(url) {
  const request = require('request-promise');
  const resp = await request(`${url}/events/latest`, { json: true });

  return resp.id;
}
