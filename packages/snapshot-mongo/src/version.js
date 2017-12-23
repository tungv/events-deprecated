import { flow, map, min } from 'lodash/fp';

import connect from './connect';

const test = reg => string => reg.test(string);
const isVersionedCollectionName = test(/^.*_v\d*\.\d*\.\d*$/);

export default async ({ store }, aggrAndPVs) => {
  const db = await connect(store);

  const snapshots = await db
    .collection('__snapshots_v1.0.0')
    .find({
      $or: aggrAndPVs,
    })
    .toArray();

  const snapshotVersion = flow(map('__v'), min)(snapshots) || 0;

  return { snapshotVersion, snapshots };
};
