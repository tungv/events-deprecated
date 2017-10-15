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
  flatten,
} from 'lodash/fp';

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

export default (async function getLatest({ store }) {
  const db = await MongoClient.connect(store);
  const snapshotVersions = await getVersions(db);
  const lastSeen = getLastSeen(snapshotVersions);

  return lastSeen || 0;
});
