#!/usr/bin/env node
/* eslint-disable no-console */
import { MongoClient } from 'mongodb';
import {
  first,
  map,
  groupBy,
  flow,
  mapValues,
  toArray,
  min,
  toPairs,
  fromPairs,
  filter,
  curry,
  flatten,
  reduce,
  assign,
  keys,
  tap,
  forEach,
  uniqBy,
  identity,
  sortBy,
} from 'lodash/fp';
import { satisfies } from 'semver';
import { resolve } from 'path';
import seed from './seed';

export const getVersions = async db => {
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

export const getLastSeen = flow(toArray, map(toArray), flatten, min);
export const inSemverRange = curry((range, versions) => {
  return flow(
    mapValues(
      flow(toPairs, filter(([pv, v]) => satisfies(pv, range)), fromPairs)
    )
  )(versions);
});

export default (async function getLatest(args) {
  const mongoUrl = args._[0];

  const db = await MongoClient.connect(mongoUrl);

  const initialValuesJSONPath = args.seed;
  const debugMode = args.debug;
  const versionRange = args.versionRange;

  const write = (...args) => {
    debugMode && console.error('[SNAPSHOT] ', ...args);
  };

  const snapshotVersions = await getVersions(db);

  const filterFn = versionRange ? inSemverRange(versionRange) : x => x;

  const selectedVersions = filterFn(snapshotVersions);
  const lastSeen = getLastSeen(selectedVersions);

  if (debugMode && lastSeen) {
    const allVersions = flow(
      toArray,
      map(keys),
      flatten,
      uniqBy(identity),
      sortBy(identity) // TODO: please swith to array.sort(semver.compare)
    )(selectedVersions);

    const Table = require('cli-table2');
    const table = new Table({
      head: ['aggregate', ...allVersions],
    });

    flow(
      toPairs,
      forEach(([aggregate, versions]) => {
        table.push([
          aggregate,
          ...allVersions.map(key => versions[key] || 'n/a'),
        ]);
      })
    )(selectedVersions);

    write(`\n${table.toString()}`);
  }

  if (!lastSeen && initialValuesJSONPath) {
    const resolvedSeedingPath = resolve(process.cwd(), initialValuesJSONPath);
    write(`seeding data from file`);
    const seedData = require(resolvedSeedingPath);
    const changes = await seed(db, seedData);
    write(`${changes} documents are inserted to mongodb`);
  }

  return lastSeen || 0;
});
