/* @flow */
import { mapToOperation } from '../createStore';

describe('mapToOperation()', () => {
  it('should map insert command', () => {
    const cmd = {
      insert: [{ age: 21, name: 'User 1' }, { age: 22, name: 'User 2' }],
    };

    const ops = mapToOperation(1000, cmd, 1);
    expect(ops).toEqual([
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gt: 1000 } }, { __op: { $gt: 1 }, __v: 1000 }],
          },
          update: {
            $setOnInsert: {
              __op: 1,
              __v: 1000,
              age: 21,
              name: 'User 1',
            },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: {
            $or: [{ __v: { $gt: 1000 } }, { __op: { $gt: 2 }, __v: 1000 }],
          },
          update: {
            $setOnInsert: {
              __op: 2,
              __v: 1000,
              age: 22,
              name: 'User 2',
            },
          },
          upsert: true,
        },
      },
    ]);
  });

  it('should map update command', () => {
    const cmd = {
      update: {
        where: { name: 'User 2' },
        changes: {
          $set: { age: 32 },
        },
      },
    };

    const ops = mapToOperation(1000, cmd, 1);
    expect(ops).toEqual([
      {
        updateMany: {
          filter: {
            $and: [
              {
                $or: [{ __v: { $lt: 1000 } }, { __op: { $lt: 1 }, __v: 1000 }],
              },
              { name: 'User 2' },
            ],
          },
          update: { $set: { __op: 1, __v: 1000, age: 32 } },
          upsert: false,
        },
      },
    ]);
  });
});
