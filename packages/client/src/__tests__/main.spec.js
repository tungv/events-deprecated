const kefir = require('kefir');
const main = require('../index');
const path = require('path');
const { MongoClient } = require('mongodb');

describe('connectivity', () => {
  it('should connect', async () => {
    const db = await MongoClient.connect(process.env.MONGO_TEST);

    await db.dropDatabase({});

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
      transform: {
        rulePath: path.resolve('./fixtures/rules/user_management.js'),
      },
    };

    const stream$ = main(config);
    stream$.observe(d => {
      console.log(
        ` [%s] %d\n%s\n%j`,
        d.meta.level,
        d.meta.ts,
        d.type,
        d.payload
      );
    });

    const p = stream$.toPromise();
    return p;
  });
});
