import { sum, assign, flow, map, toPairs } from 'lodash/fp';
const seed = async (db, { __pv, aggregates }) => {
  const promises = flow(
    toPairs,
    map(async ([aggregateName, docs]) => {
      const collName = `${aggregateName}_v${__pv}`;
      const coll = db.collection(collName);
      try {
        await db.dropCollection(collName);
      } catch (ex) {
        // console.log(ex);
        // nothing
        // happens when collection was not initialized yet
      }

      return coll.insertMany(docs.map(assign({ __v: 0 })));
    })
  )(aggregates);

  const r = await Promise.all(promises);

  return flow(map('result.n'), sum)(r);
};

export default seed;
