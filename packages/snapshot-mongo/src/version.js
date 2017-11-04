import {
  filter,
  flow,
  identity,
  initial,
  join,
  last,
  map,
  over,
  path,
  split,
} from 'lodash/fp';

const test = reg => string => reg.test(string);
const isVersionedCollectionName = test(/^.*_v\d*\.\d*\.\d*$/);

export default async db => {
  const collections = await db.collections();

  const tuples = flow(
    filter(flow(path('collectionName'), isVersionedCollectionName)),
    map(
      over([
        flow(path('collectionName'), split('_v'), initial, join('_v')),
        flow(path('collectionName'), split('_v'), last),
        identity,
      ])
    )
  )(collections);

  const r = [];

  for (const tuple of tuples) {
    const { __v } = await tuple[2].findOne(
      {},
      { sort: { __v: -1 }, fields: { __v: 1 } }
    );

    r.push({ name: tuple[0], pv: tuple[1], version: __v });
  }

  return r;
};
