import persist from '../persist';
import kefir from 'kefir';
import { MongoClient } from 'mongodb';

const { MONGO_TEST } = process.env;

const bulkWriteModule = require('../bulkWrite');
const bulkWriteSpy = jest.spyOn(bulkWriteModule, 'default');

const fromArray = array => kefir.sequentially(0, array);

const toArray = stream$ =>
  stream$.scan((array, item) => array.concat(item), []).toPromise();

const dropDB = async url => {
  const client = await MongoClient.connect(url);
  await client.dropDatabase();
};

const getPersistenceResults = async ({
  config = { _: [MONGO_TEST], buffer: { enabled: false } },
  projections = [],
  collections = [
    { name: 'col1', version: '1.0.0' },
    { name: 'col2', version: '1.0.0' },
  ],
}) => {
  const persistence$ = await persist(config, fromArray(projections), [
    { name: 'col1', version: '1.0.0' },
    { name: 'col2', version: '1.0.0' },
  ]);

  return toArray(persistence$);
};

describe('persist', () => {
  beforeEach(() => {
    bulkWriteSpy.mockClear();
  });

  it("should persist a single event's projection", async () => {
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

    const out = await getPersistenceResults({ projections });

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
          filter: {
            $and: [
              { $or: [{ __v: { $lt: 1 } }, { __op: { $lt: 1 }, __v: 1 }] },
              { name: 'col1', version: '1.0.0' },
            ],
          },
          update: { $set: { __op: 1, __v: 1 } },
          upsert: true,
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { $or: [{ __v: { $lt: 1 } }, { __op: { $lt: 2 }, __v: 1 }] },
              { name: 'col2', version: '1.0.0' },
            ],
          },
          update: { $set: { __op: 2, __v: 1 } },
          upsert: true,
        },
      },
    ]);

    // col1_v1.0.0
    expect(spyCalls[1][1]).toEqual([
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gte: 1 } }, { __op: { $gte: 1 }, __v: 1 }],
          },
          update: { $setOnInsert: { __op: 1, __v: 1, x: 1 } },
          upsert: true,
        },
      },
    ]);

    expect(out[0].changes).toBe(2);
  });

  it('should persist 2 events', async () => {
    await dropDB(MONGO_TEST);

    const projections = [
      {
        event: { id: 1 },
        projections: {
          col1: [{ __pv: '1.0.0', op: { insert: [{ x: 1 }] } }],
          col2: [{ __pv: '1.0.0', op: { insert: [{ y: 2 }] } }],
        },
      },
      {
        event: { id: 2 },
        projections: {
          col1: [
            {
              __pv: '1.0.0',
              op: { update: { where: { x: 1 }, changes: { $set: { x: 2 } } } },
            },
          ],
        },
      },
    ];

    const out = await getPersistenceResults({ projections });

    const spyCalls = bulkWriteSpy.mock.calls;

    expect(spyCalls.map(args => args[0].collectionName)).toEqual([
      '__snapshots_v1.0.0',
      'col1_v1.0.0',
      'col2_v1.0.0',
      'col1_v1.0.0',
    ]);

    expect(spyCalls[1][1]).toEqual([
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gte: 1 } }, { __op: { $gte: 1 }, __v: 1 }],
          },
          update: { $setOnInsert: { __op: 1, __v: 1, x: 1 } },
          upsert: true,
        },
      },
    ]);
    expect(spyCalls[2][1]).toEqual([
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gte: 1 } }, { __op: { $gte: 2 }, __v: 1 }],
          },
          update: { $setOnInsert: { __op: 2, __v: 1, y: 2 } },
          upsert: true,
        },
      },
    ]);
    expect(spyCalls[3][1]).toEqual([
      {
        updateMany: {
          filter: {
            $and: [
              { $or: [{ __v: { $lt: 2 } }, { __op: { $lt: 1 }, __v: 2 }] },
              { x: 1 },
            ],
          },
          update: { $set: { __op: 1, __v: 2, x: 2 } },
          upsert: false,
        },
      },
    ]);
  });

  it('should persist events with multiple changes for one document', async () => {
    await dropDB(MONGO_TEST);

    const projections = [
      {
        event: { id: 1 },
        projections: {
          col1: [
            { __pv: '1.0.0', op: { insert: [{ id: 1, array: [1, 2, 3] }] } },
          ],
        },
      },
      {
        event: { id: 2 },
        projections: {
          col1: [
            {
              __pv: '1.0.0',
              op: {
                update: {
                  where: { id: 1 },
                  changes: { $addToSet: { array: 4 } },
                },
              },
            },
            {
              __pv: '1.0.0',
              op: {
                update: {
                  where: { id: 1 },
                  changes: { $pull: { array: 1 } },
                },
              },
            },
          ],
        },
      },
    ];

    const out = await getPersistenceResults({ projections });

    const spyCalls = bulkWriteSpy.mock.calls;

    expect(spyCalls.map(args => args[0].collectionName)).toEqual([
      '__snapshots_v1.0.0',
      'col1_v1.0.0',
      'col1_v1.0.0',
    ]);

    expect(spyCalls[1][1]).toEqual([
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gte: 1 } }, { __v: 1, __op: { $gte: 1 } }],
          },
          update: {
            $setOnInsert: { __v: 1, __op: 1, array: [1, 2, 3], id: 1 },
          },
          upsert: true,
        },
      },
    ]);
    expect(spyCalls[2][1]).toEqual([
      {
        updateMany: {
          filter: {
            $and: [
              { $or: [{ __v: { $lt: 2 } }, { __v: 2, __op: { $lt: 1 } }] },
              { id: 1 },
            ],
          },
          update: { $addToSet: { array: 4 }, $set: { __v: 2, __op: 1 } },
          upsert: false,
        },
      },
      {
        updateMany: {
          filter: {
            $and: [
              { $or: [{ __v: { $lt: 2 } }, { __v: 2, __op: { $lt: 2 } }] },
              { id: 1 },
            ],
          },
          update: { $pull: { array: 1 }, $set: { __v: 2, __op: 2 } },
          upsert: false,
        },
      },
    ]);

    expect(out.map(r => r.changes)).toEqual([1, 2]);

    const client = await MongoClient.connect(MONGO_TEST);
    const doc = await client.collection('col1_v1.0.0').findOne({ id: 1 });

    expect(doc.array).toEqual([2, 3, 4]);
  });
});
