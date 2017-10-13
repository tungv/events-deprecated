const kefir = require('kefir');
const main = require('../index');

describe('connectivity', () => {
  it('should connect', async () => {
    const config = {
      logLevel: 'DEBUG',
      subscribe: {
        serverUrl: process.env.EVENT_STORE_URL,
        burstCount: 20,
        burstTime: 500,
      },
      persist: {
        store: process.env.MONGO_TEST,
        driver: '@events/snapshot-mongo',
      },
    };

    const stream$ = main(config);
    stream$.observe(d => console.log(d));

    const p = stream$.toPromise();
    return p;
  });
});
