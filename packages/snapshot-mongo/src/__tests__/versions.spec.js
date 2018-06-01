import { MongoClient } from 'mongodb';

import getVerions from '../version';

const getClient = () => MongoClient.connect(process.env.MONGO_TEST);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('get versions', () => {
  it('should fetch all collections and get the latest __v', async () => {
    const db = await getClient();

    try {
      await db.dropCollection('users_v1.0.0');
      await db.dropCollection('users_v1.1.0');
      await db.dropCollection('users_v2.0.0');
      await db.dropCollection('with_v_in_name_v2.0.0');
      await db.dropCollection('with_v_in_name_v3.0.0');
    } catch (ex) {}

    await db.collection('not_related').insert({ any: 'thing' });

    await db
      .collection('users_v1.0.0')
      .insertMany([
        { __v: 1, name: 'test' },
        { __v: 2, name: 'test' },
        { __v: 3, name: 'test' },
        { __v: 4, name: 'test' },
        { __v: 5, name: 'test' },
      ]);
    await db
      .collection('users_v1.1.0')
      .insertMany([
        { __v: 3, name: 'test' },
        { __v: 4, name: 'test' },
        { __v: 5, name: 'test' },
        { __v: 7, name: 'test' },
        { __v: 9, name: 'test' },
      ]);
    await db
      .collection('users_v2.0.0')
      .insertMany([
        { __v: 31, name: 'test' },
        { __v: 32, name: 'test' },
        { __v: 33, name: 'test' },
        { __v: 34, name: 'test' },
        { __v: 35, name: 'test' },
      ]);
    await db
      .collection('with_v_in_name_v2.0.0')
      .insertMany([
        { __v: 31, name: 'test' },
        { __v: 52, name: 'test' },
        { __v: 53, name: 'test' },
        { __v: 54, name: 'test' },
        { __v: 55, name: 'test' },
      ]);
    await db
      .collection('with_v_in_name_v3.0.0')
      .insertMany([
        { __v: 61, name: 'test' },
        { __v: 62, name: 'test' },
        { __v: 63, name: 'test' },
        { __v: 64, name: 'test' },
        { __v: 65, name: 'test' },
      ]);

    const versions = await getVerions(
      {
        store: process.env.MONGO_TEST,
      },
      [
        {
          name: 'users',
          version: '1.0.0',
        },
        {
          name: 'users',
          version: '2.0.0',
        },
        {
          name: 'with_v_in_name',
          version: '3.0.0',
        },
      ]
    );

    await sleep(100);

    expect(versions).toEqual({
      snapshotVersion: 0,
      snapshots: [],
    });
  });
});
