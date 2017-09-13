import { MongoClient } from 'mongodb';
import {
  first,
  map,
  groupBy,
  flow,
  mapValues,
  path,
  toArray,
  min,
  toPairs,
  fromPairs,
  filter,
  curry,
  flatten,
  tap,
} from 'lodash/fp';
import { satisfies } from 'semver';

const getVersions = async ({ mongoUrl }) => {
  const db = await MongoClient.connect(mongoUrl);

  const versions = await db
    .collection('versions')
    .find({})
    .toArray();

  const byAggregate = groupBy('aggregate', versions);

  const byAggregateAndVersions = mapValues(
    flow(groupBy('__pv'), mapValues(flow(map('__v'), first)))
  )(byAggregate);

  return byAggregateAndVersions;
};

const getLastSeen = flow(toArray, map(toArray), flatten, min);
const inSemverRange = curry((range, versions) => {
  return flow(
    mapValues(
      flow(toPairs, filter(([pv, v]) => satisfies(pv, range)), fromPairs)
    )
  )(versions);
});

const getClient = () => MongoClient.connect(process.env.MONGO_TEST);

describe('get versions', () => {
  it('should query all versions', async () => {
    const args = {
      mongoUrl: process.env.MONGO_TEST,
    };

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

    const versions = await getVersions(args);
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
