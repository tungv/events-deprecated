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

import bulkWrite from './bulkWrite';
import connect from './connect';

export function mapToOperation<Doc>(
  version: number,
  op: any,
  opCounter: number
): Operation<Doc>[] {
  if (op.insert) {
    return op.insert.map((doc, index) => {
      const insertingOpCounter = opCounter + index;
      const setOnInsert: WithVersion<Doc> = {
        __v: version,
        __op: insertingOpCounter,
        ...doc,
      };

      return {
        updateOne: {
          filter: {
            $or: [
              { __v: { $gte: version } },
              { __v: version, __op: { $gte: insertingOpCounter } },
            ],
          },
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
    const enhanceUpdate = flow(
      set('$set.__v', version),
      set('$set.__op', opCounter)
    );

    const update = enhanceUpdate(changes);

    const filter = {
      $and: [
        {
          $or: [
            { __v: { $lt: version } },
            { __v: version, __op: { $lt: opCounter } },
          ],
        },
        where,
      ],
    };

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

const mapCollectionOpToMongoOp = v => ([collection, op], index) => [
  collection,
  mapToOperation(v, op, index + 1),
];

const mapRequestToMongoOps = map(
  flow(
    over([getCollectionNameAndOpFromRequest, getEventId]),
    ([collectionOps, v]) => {
      const fn = mapCollectionOpToMongoOp(v);

      const a = collectionOps.reduce(
        (accum, [collection, op]) => {
          const out = fn([collection, op], accum.opCounter);

          const numOfOps = op.insert ? op.insert.length : 1;
          const nextCounter = accum.opCounter + numOfOps;

          return {
            mongoOps: accum.mongoOps.concat([out]),
            opCounter: nextCounter,
          };
        },
        {
          mongoOps: [],
          opCounter: 0,
        }
      );

      return a.mongoOps;
    }
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

export default async function createStore(url: string) {
  const db = await connect(url);

  return async function dispatch(
    array: DispatchInput
  ): Promise<BatchDispatchOutput> {
    const operationsByCollection: {
      [collectionName: string]: Operation<*>[],
    } = mapAndGroupRequestToMongoOps(array);

    const promises = flow(
      toPairs,
      map(async ([collectionName, ops]) => {
        const { nInserted, nUpserted, nModified, nRemoved } = await bulkWrite(
          db.collection(collectionName),
          ops
        );

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
