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

  it('should filter only versions matcing ranges', () => {
    const versions = {
      users: { '1.0.0': 3, '1.1.0': 5, '2.0.0': 4 },
      posts: { '1.1.0': 5, '2.0.0': 4, '3.0.1': 10 },
    };

    const filtered = inSemverRange('^2.x.x', versions);
    expect(filtered).toEqual({
      users: { '2.0.0': 4 },
      posts: { '2.0.0': 4 },
    });
  });

  it('should filter and get last seen when composed', () => {
    const composed = flow(inSemverRange('^2.x.x'), getLastSeen);
    expect(
      composed({
        users: { '1.0.0': 3, '1.1.0': 5, '2.0.0': 4 },
        posts: { '1.1.0': 5, '2.0.0': 6, '3.0.1': 10 },
      })
    ).toBe(4);
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
      _: [process.env.MONGO_TEST],
      debug: true,
    };
    const lastSeen = await cli(args);

    expect(lastSeen).toBe(30);
  });

  it('should print with version range', async () => {
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
      _: [process.env.MONGO_TEST],
      debug: true,
      versionRange: '^2.x',
    };
    const lastSeen = await cli(args);

    expect(lastSeen).toBe(40);
  });

  it('should seed', async () => {
    const db = await getClient();

    try {
      await db.dropCollection('versions');
    } catch (ex) {}

    const args = {
      _: [process.env.MONGO_TEST],
      debug: true,
      versionRange: '^2.x',
      seed: './src/__tests__/fixtures/test_seeding.json',
    };
    const lastSeen = await cli(args);

    expect(lastSeen).toBe(0);

    const users = await db
      .collection('users_v1.0.0')
      .find({})
      .toArray();

    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uid: 1234, name: 'Test user 1', age: 20 }),
        expect.objectContaining({ uid: 1235, name: 'Test user 2', age: 20 }),
        expect.objectContaining({ uid: 1236, name: 'Test user 3', age: 20 }),
      ])
    );
  });
});
