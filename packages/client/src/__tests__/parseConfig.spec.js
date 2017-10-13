const parseConfig = require('../parseConfig');
const hasModule = require('../has-module');

jest.mock('../has-module');

describe('config: subscribe', () => {
  it('should throw if subscribe is not defined', () => {
    return expect(parseConfig({})).rejects.toMatchSnapshot();
  });

  it('should throw if subscribe.serverUrl is not defined', () => {
    return expect(parseConfig({ subscribe: {} })).rejects.toMatchSnapshot();
  });

  it('should not throw if subscribe.burstCount or subscribe.burstTime are not defined', async () => {
    const config = await parseConfig({
      subscribe: {
        serverUrl: process.env.EVENT_STORE_URL,
      },
      persist: {
        store: process.env.MONGO_TEST,
      },
    });

    expect(config).toMatchObject({
      subscribe: {
        serverUrl: process.env.EVENT_STORE_URL,
        burstCount: 20,
        burstTime: 500,
      },
    });
  });

  it('should throw if subscribe.serverUrl is unreachable', () => {
    return expect(
      parseConfig({
        subscribe: {
          serverUrl: 'http://localhost:1338',
        },
      })
    ).rejects.toMatchSnapshot();
  });
});

describe('config: persist', () => {
  it('should detect persist driver is defined', async () => {
    const config = {
      subscribe: { serverUrl: process.env.EVENT_STORE_URL },
      persist: {
        store: process.env.MONGO_TEST,
      },
    };

    expect(await parseConfig(config)).toMatchObject({
      persist: {
        store: process.env.MONGO_TEST,
        driver: '@events/snapshot-mongo',
      },
    });

    expect(hasModule).toBeCalledWith('@events/snapshot-mongo');
  });
});
