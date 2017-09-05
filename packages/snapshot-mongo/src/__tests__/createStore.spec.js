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

    await db.dropCollection('users');

    const requests: UpdateRequest[] = [
      {
        __v: 1,
        users: [{ insert: [{ name: 'Test 1', age: 21 }] }],
      },
      {
        __v: 2,
        users: [
          {
            update: {
              where: { name: 'Test 1' },
              changes: { $inc: { age: 1 } },
            },
          },
        ],
      },
    ];

    await dispatch(requests[0]);
    await dispatch(requests[1]);

    const users = await db
      .collection('users')
      .find({})
      .toArray();

    expect(users[0].__v).toBe(2);
    expect(users[0].name).toBe('Test 1');
    expect(users[0].age).toBe(22);

    db.close();
  });

  it('should not run insert and update twice', async () => {
    const { dispatch, db } = await makeDispatch();

    await db.dropCollection('users');

    const requests: UpdateRequest[] = [
      {
        __v: 1,
        users: [{ insert: [{ name: 'Test 1', age: 21 }] }],
      },
      {
        __v: 2,
        users: [
          {
            update: {
              where: { name: 'Test 1' },
              changes: { $inc: { age: 1 } },
            },
          },
        ],
      },
    ];

    await dispatch(requests[0]);
    await dispatch(requests[1]);

    await dispatch(requests[0]);
    await dispatch(requests[1]);

    const users = await db
      .collection('users')
      .find({})
      .toArray();

    expect(users.length).toBe(1);
    expect(users[0].__v).toBe(2);
    expect(users[0].name).toBe('Test 1');
    expect(users[0].age).toBe(22);

    db.close();
  });
});
