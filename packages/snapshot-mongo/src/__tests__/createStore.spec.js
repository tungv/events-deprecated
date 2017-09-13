/* @flow */
import { MongoClient } from 'mongodb';
import createStore from '../createStore';

describe('e2e', () => {
  const makeDispatch = async () => {
    const db = await MongoClient.connect(process.env.MONGO_TEST);
    const dispatch = createStore(db);

    return {
      dispatch,
      db,
    };
  };

  it('should insert', async () => {
    const { dispatch, db } = await makeDispatch();

    try {
      await db.dropCollection('users_v1_0_0');
      await db.dropCollection('versions');
    } catch (ex) {}

    const requests: UpdateRequest[] = [
      {
        __v: 1,
        users: [
          { __pv: '1.0.0', op: { insert: [{ name: 'Test 1', age: 21 }] } },
        ],
      },
      {
        __v: 2,
        users: [
          {
            __pv: '1.0.0',
            op: {
              update: {
                where: { name: 'Test 1' },
                changes: { $inc: { age: 1 } },
              },
            },
          },
        ],
      },
    ];

    expect(await dispatch(requests[0])).toBe(1);
    expect(await dispatch(requests[1])).toBe(1);

    const users = await db
      .collection('users_v1_0_0')
      .find({})
      .toArray();

    expect(users[0].__v).toBe(2);
    expect(users[0].name).toBe('Test 1');
    expect(users[0].age).toBe(22);

    const versions = await db
      .collection('versions')
      .find({})
      .toArray();

    expect(versions).toHaveLength(1);
    expect(versions[0]).toHaveProperty('aggregate', 'users');
    expect(versions[0]).toHaveProperty('__pv', '1.0.0');
    expect(versions[0]).toHaveProperty('__v', 2);
    expect(versions[0]).toHaveProperty('last_snapshot_time', expect.any(Date));
    db.close();
  });

  it('should not run insert and update twice', async () => {
    const { dispatch, db } = await makeDispatch();

    try {
      await db.dropCollection('users_v1_0_0');
      await db.dropCollection('versions');
    } catch (ex) {}

    const requests: UpdateRequest[] = [
      {
        __v: 1,
        users: [
          { __pv: '1.0.0', op: { insert: [{ name: 'Test 1', age: 21 }] } },
        ],
      },
      {
        __v: 2,
        users: [
          {
            __pv: '1.0.0',
            op: {
              update: {
                where: { name: 'Test 1' },
                changes: { $inc: { age: 1 } },
              },
            },
          },
        ],
      },
    ];

    await dispatch(requests[0]);
    await dispatch(requests[1]);

    expect(await dispatch(requests[0])).toBe(0);
    expect(await dispatch(requests[1])).toBe(0);

    const users = await db
      .collection('users_v1_0_0')
      .find({})
      .toArray();

    expect(users.length).toBe(1);
    expect(users[0].__v).toBe(2);
    expect(users[0].name).toBe('Test 1');
    expect(users[0].age).toBe(22);

    db.close();
  });

  it('should work with multiple versions of projection', async () => {
    const { dispatch, db } = await makeDispatch();

    try {
      await db.dropCollection('users_v1_0_0');
      await db.dropCollection('users_v1_1_0');
      await db.dropCollection('versions');
    } catch (ex) {}

    const requests: UpdateRequest[] = [
      {
        __v: 1,
        users: [
          { __pv: '1.0.0', op: { insert: [{ name: 'Test 1', age: 21 }] } },
          {
            __pv: '1.1.0',
            op: { insert: [{ first_name: 'Test', last_name: 'One', age: 21 }] },
          },
        ],
      },
      {
        __v: 2,
        users: [
          {
            __pv: '1.0.0',
            op: {
              update: {
                where: { name: 'Test 1' },
                changes: { $inc: { age: 1 } },
              },
            },
          },
          {
            __pv: '1.1.0',
            op: {
              update: {
                where: { last_name: 'One', first_name: 'Test' },
                changes: { $inc: { age: 1 } },
              },
            },
          },
        ],
      },
    ];

    expect(await dispatch(requests[0])).toBe(2);
    expect(await dispatch(requests[1])).toBe(2);

    const users_v1 = await db
      .collection('users_v1_0_0')
      .find({})
      .toArray();

    expect(users_v1).toHaveLength(1);

    expect(users_v1[0]).toHaveProperty('__v', 2);
    expect(users_v1[0]).toHaveProperty('name', 'Test 1');
    expect(users_v1[0]).toHaveProperty('age', 22);

    const users_v1_1 = await db
      .collection('users_v1_1_0')
      .find({})
      .toArray();

    expect(users_v1_1).toHaveLength(1);

    expect(users_v1_1[0]).toHaveProperty('__v', 2);
    expect(users_v1_1[0]).toHaveProperty('first_name', 'Test');
    expect(users_v1_1[0]).toHaveProperty('last_name', 'One');
    expect(users_v1_1[0]).toHaveProperty('age', 22);

    const versions = await db
      .collection('versions')
      .find({})
      .toArray();

    expect(versions).toHaveLength(2);

    expect(versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          aggregate: 'users',
          __pv: '1.0.0',
          __v: 2,
          last_snapshot_time: expect.any(Date),
        }),
        expect.objectContaining({
          aggregate: 'users',
          __pv: '1.1.0',
          __v: 2,
          last_snapshot_time: expect.any(Date),
        }),
      ])
    );
    db.close();
  });
});
