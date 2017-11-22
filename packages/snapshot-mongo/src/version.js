import { MongoClient } from 'mongodb';
import { flow, map, min } from 'lodash/fp';

const test = reg => string => reg.test(string);
const isVersionedCollectionName = test(/^.*_v\d*\.\d*\.\d*$/);

export default async ({ store }, aggrAndPVs) => {
  const db = await MongoClient.connect(store);

  const snapshots = await db
    .collection('__snapshots_v1.0.0')
    .find({
      $or: aggrAndPVs,
    })
    .toArray();

  console.log('snapshots', snapshots);

  const snapshotVersion = flow(map('__v'), min)(snapshots) || 0;

  return { snapshotVersion, snapshots };
};
