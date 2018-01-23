import persist from '../persist';
import kefir from 'kefir';
import { MongoClient } from 'mongodb';

const { MONGO_TEST } = process.env;

const bulkWriteModule = require('../bulkWrite');
const bulkWriteSpy = jest.spyOn(bulkWriteModule, 'default');

const fromArray = array => kefir.sequentially(1, array);

const toArray = stream$ =>
  stream$.scan((array, item) => array.concat(item), []).toPromise();

const dropDB = async url => {
  const client = await MongoClient.connect(url);
  await client.dropDatabase();
};

const getPersistenceResults = async ({
  config = { _: [MONGO_TEST] },
  projections = [],
  collections = [],
}) => {
  const persistence$ = await persist(config, fromArray(projections), [
    { name: 'col1', version: '1.0.0' },
    { name: 'col2', version: '1.0.0' },
  ]);

  return toArray(persistence$);
};

describe('persist', () => {
  test("persist a single event's projection", async () => {
    // reset
    await dropDB(MONGO_TEST);

    const projections = [
      {
        event: { id: 1 },
        projections: {
          col1: [{ __pv: '1.0.0', op: { insert: [{ x: 1 }] } }],
          col2: [{ __pv: '1.0.0', op: { insert: [{ y: 2 }] } }],
        },
      },
    ];

    const collections = [
      { name: 'col1', version: '1.0.0' },
      { name: 'col2', version: '1.0.0' },
    ];

    const out = await getPersistenceResults({ projections, collections });

    // snapshot, col1, col2
    expect(bulkWriteSpy).toHaveBeenCalledTimes(3);

    const spyCalls = bulkWriteSpy.mock.calls;

    expect(spyCalls.map(args => args[0].collectionName)).toEqual([
      '__snapshots_v1.0.0',
      'col1_v1.0.0',
      'col2_v1.0.0',
    ]);

    // snapshot
    // this will set snapshot versions for all interested collection to the latest event.id
    expect(spyCalls[0][1]).toEqual([
      {
        updateMany: {
          filter: { __v: { $lt: 1 }, name: 'col1', version: '1.0.0' },
          update: { $set: { __v: 1 } },
          upsert: true,
        },
      },
      {
        updateMany: {
          filter: { __v: { $lt: 1 }, name: 'col2', version: '1.0.0' },
          update: { $set: { __v: 1 } },
          upsert: true,
        },
      },
    ]);

    // col1_v1.0.0
    expect(spyCalls[1][1]).toEqual([
      {
        updateOne: {
          filter: { __v: { $gte: 1 } },
          update: { $setOnInsert: { __v: 1, x: 1 } },
          upsert: true,
        },
      },
    ]);

    expect(out[0].changes).toBe(2);
  });
});
