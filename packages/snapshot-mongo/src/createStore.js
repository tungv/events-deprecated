/* @flow */

import {
  sum,
  flatten,
  flow,
  map,
  set,
  groupBy,
  toPairs,
  filter,
  path,
  over,
  mapValues,
  pickBy,
  isArray,
} from 'lodash/fp';
import MongoHeartbeat from 'mongo-heartbeat';

export function mapToOperation<Doc>(
  version: number,
  op: any
): Operation<Doc>[] {
  if (op.insert) {
    return op.insert.map(doc => {
      const setOnInsert: WithVersion<Doc> = { __v: version, ...doc };

      return {
        updateOne: {
          filter: { __v: { $gte: version } },
          update: {
            $setOnInsert: setOnInsert,
          },
          upsert: true,
        },
      };
    });
  }

  if (op.update) {
    const { changes, where, upsert = false } = op.update;
    const update = set('$set.__v', version, changes);
    const filter = set('__v.$lt', version, where);
    return [
      {
        updateMany: {
          filter,
          update,
          upsert,
        },
      },
    ];
  }

  return [];
}

const getCollectionNameAndOpFromRequest = flow(
  path('projections'),
  pickBy(isArray),
  toPairs,
  map(([collectionName, cmdArray]) =>
    cmdArray.map(cmd => [`${collectionName}_v${cmd.__pv}`, cmd.op])
  ),
  flatten
);

const getEventId = path('event.id');

const mapCollectionOpToMongoOp = v => ([collection, op]) => [
  collection,
  mapToOperation(v, op),
];

const mapRequestToMongoOps = map(
  flow(
    over([getCollectionNameAndOpFromRequest, getEventId]),
    ([collectionOps, v]) => collectionOps.map(mapCollectionOpToMongoOp(v))
  )
);

const groupByFirstItem = groupBy('0');
const flattenSecondItem = flow(map('1'), flatten);

const mapAndGroupRequestToMongoOps = flow(
  mapRequestToMongoOps,
  flatten,
  groupByFirstItem,
  mapValues(flattenSecondItem)
);

type DispatchInput = Array<{
  event: any,
  projections: UpdateRequest,
}>;

type BatchDispatchOutput = {
  changes: number,
  requests: DispatchInput,
};

export default function createStore(db: DB) {
  const hb = MongoHeartbeat(db, {
    interval: 5000,
    timeout: 10000,
    tolerance: 2,
  });

  hb.on('error', err => {
    console.error('mongodb didnt respond the heartbeat message');
    process.nextTick(function() {
      process.exit(1);
    });
  });

  return async function dispatch(
    array: DispatchInput
  ): Promise<BatchDispatchOutput> {
    const operationsByCollection: {
      [collectionName: string]: Operation<*>[],
    } = mapAndGroupRequestToMongoOps(array);
    const promises = flow(
      toPairs,
      map(async ([collectionName, ops]) => {
        const coll = db.collection(collectionName);

        const {
          nInserted,
          nUpserted,
          nModified,
          nRemoved,
        } = await coll.bulkWrite(ops);

        return [collectionName, nInserted + nUpserted + nModified + nRemoved];
      })
    )(operationsByCollection);

    const results: Array<[string, number]> = await Promise.all(promises);

    const changes = flow(map(1), sum)(results);

    return {
      requests: array,
      changes,
    };
  };
}
