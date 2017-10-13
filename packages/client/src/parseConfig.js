const InvalidConfigError = require('./InvalidConfigError');
const InvalidEndpoint = require('./InvalidEndpoint');
const detectDriver = require('./detectPersistDriver');
const DriverNotFoundError = require('./DriverNotFoundError');
const hasModule = require('./has-module');

module.exports = async config => {
  const { subscribe, persist } = config;

  if (!subscribe) {
    throw new InvalidConfigError({
      path: 'subscribe',
      expected: 'Object',
      actual: JSON.stringify(subscribe),
    });
  }

  const { serverUrl, burstCount = 20, burstTime = 500 } = subscribe;

  if (!serverUrl) {
    throw new InvalidConfigError({
      path: 'subscribe.serverUrl',
      expected: 'http or https endpoint',
      actual: JSON.stringify(serverUrl),
    });
  }

  await validateServerUrl(serverUrl);

  const { store, driver } = persist;

  if (!store) {
    throw new InvalidConfigError({
      path: 'persist.store',
      expected: 'a connection string',
      actual: JSON.stringify(store),
    });
  }

  const actualDriver = driver || detectDriver(store);

  if (!hasModule(actualDriver)) {
    throw new DriverNotFoundError(actualDriver);
  }

  return {
    subscribe: {
      serverUrl,
      burstCount,
      burstTime,
    },
    persist: {
      store,
      driver: actualDriver,
    },
  };
};

async function validateServerUrl(url) {
  const request = require('request-promise');

  try {
    const resp = await request(`${url}/query`, { json: true });

    if (Array.isArray(resp) && resp.length === 0) {
      return true;
    }
  } catch (e) {
    const { message } = e;
    throw new InvalidEndpoint({
      endpoint: url,
      reason: message,
    });
  }

  throw new InvalidEndpoint({
    endpoint: url,
    reason: 'not an event server',
  });
}
