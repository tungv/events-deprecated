import { MongoClient } from 'mongodb';
import { flow } from 'lodash/fp';

import cli, { getLastSeen, getVersions, inSemverRange } from '../version';

const getClient = () => MongoClient.connect(process.env.MONGO_TEST);

describe('get versions', () => {
  it('should query all versions', async () => {
    const db = await getClient();

    try {
      await db.dropCollection('versions');
    } catch (ex) {}

    await db
      .collection('versions')
      .insertMany([
        { __v: 3, __pv: '1.0.0', aggregate: 'users' },
        { __v: 5, __pv: '1.1.0', aggregate: 'users' },
        { __v: 4, __pv: '2.0.0', aggregate: 'users' },
        { __v: 5, __pv: '1.1.0', aggregate: 'posts' },
        { __v: 4, __pv: '2.0.0', aggregate: 'posts' },
      ]);

    const versions = await getVersions(db);
    expect(versions).toEqual({
      users: { '1.0.0': 3, '1.1.0': 5, '2.0.0': 4 },
      posts: { '1.1.0': 5, '2.0.0': 4 },
    });
  });

  it('should get the oldest snapshot version amongst all projection versions', () => {
    const versions = {
      users: { '1.0.0': 3, '1.1.0': 5, '2.0.0': 4 },
      posts: { '1.1.0': 5, '2.0.0': 4 },
    };

    const actual = getLastSeen(versions);
    expect(actual).toBe(3);
  });
});

describe('cli tool', () => {
  it('should print without version range', async () => {
    const db = await getClient();

    try {
      await db.dropCollection('versions');
    } catch (ex) {}

    await db
      .collection('versions')
      .insertMany([
        { __v: 30, __pv: '1.0.0', aggregate: 'users' },
        { __v: 50, __pv: '1.1.0', aggregate: 'users' },
        { __v: 40, __pv: '2.0.0', aggregate: 'users' },
        { __v: 50, __pv: '1.1.0', aggregate: 'posts' },
        { __v: 40, __pv: '2.0.0', aggregate: 'posts' },
      ]);

    const args = {
      store: process.env.MONGO_TEST,
    };
    const lastSeen = await cli(args);

    expect(lastSeen).toBe(30);
  });
});
