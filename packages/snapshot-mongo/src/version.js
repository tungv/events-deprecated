import { MongoClient } from 'mongodb';
import { flow, map, min } from 'lodash/fp';

const test = reg => string => reg.test(string);
const isVersionedCollectionName = test(/^.*_v\d*\.\d*\.\d*$/);

export default async ({ store }, aggrAndPVs) => {
  const db = await MongoClient.connect(store);

  const promises = aggrAndPVs.map(async ({ name, version }) => {
    const collName = `${name}_v${version}`;

    const coll = db.collection(collName);

    const ret = await coll.findOne(
      {},
      { sort: { __v: -1 }, fields: { __v: 1 } }
    );

    return {
      name,
      pv: version,
      version: ret ? ret.__v : 0,
    };
  });

  const explain = await Promise.all(promises);

  const snapshotVersion = flow(map('version'), min)(explain);

  return { snapshotVersion, explain };
};
