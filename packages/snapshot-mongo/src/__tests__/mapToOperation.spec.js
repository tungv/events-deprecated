/* @flow */
import { mapToOperation } from '../createStore';

describe('mapToOperation()', () => {
  it('should map insert command', () => {
    const cmd = {
      __pv: '1.0.0',
      op: {
        insert: [{ age: 21, name: 'User 1' }, { age: 22, name: 'User 2' }],
      },
    };

    const ops = mapToOperation(1000, cmd);
    expect(ops).toEqual([
      {
        updateOne: {
          upsert: true,
          filter: { __v: { $gte: 1000 } },
          update: {
            $setOnInsert: { age: 21, name: 'User 1', __v: 1000 },
          },
        },
      },
      {
        updateOne: {
          upsert: true,
          filter: { __v: { $gte: 1000 } },
          update: {
            $setOnInsert: { age: 22, name: 'User 2', __v: 1000 },
          },
        },
      },
    ]);
  });

  it('should map update command', () => {
    const cmd = {
      __pv: '1.0.0',
      op: {
        update: {
          where: { name: 'User 2' },
          changes: {
            $set: { age: 32 },
          },
        },
      },
    };

    const ops = mapToOperation(1000, cmd);
    expect(ops).toEqual([
      {
        updateMany: {
          filter: { __v: { $lt: 1000 }, name: 'User 2' },
          update: {
            $set: { age: 32, __v: 1000 },
          },
        },
      },
    ]);
  });
});
