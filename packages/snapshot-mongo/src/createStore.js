/* @flow */
import {
  fromPairs,
  sum,
  flatten,
  flow,
  map,
  set,
  groupBy,
  tap,
  toPairs,
  filter,
  path,
} from 'lodash/fp';

export function mapToOperation<Doc>(
  version: number,
  cmd: Command<Doc>
): Operation<Doc>[] {
  if (cmd.op.insert) {
    return cmd.op.insert.map(doc => {
      // $FlowFixMe
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

  if (cmd.op.update) {
    const { changes, where, upsert = false } = cmd.op.update;
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

export default function createStore(db: DB) {
  return async function dispatch(
    request: UpdateRequest
  ): Promise<{ __v: number, changes: number }> {
    const { __v: version, ...collections } = request;
    const promises: Array<Promise<number>> = Object.keys(
      collections
    ).map(async aggregateName => {
      const promises = flow(
        groupBy('__pv'),
        toPairs,
        map(([pv, cmdArray]: [string, Command<*>[]]) => [
          `${aggregateName}_v${pv}`,
          flow(map(cmd => mapToOperation(version, cmd)), flatten)(cmdArray),
          pv,
        ]),
        filter(path('1.length')),
        map(async ([collectionName, ops, pv]) => {
          const coll = db.collection(collectionName);

          const {
            nInserted,
            nUpserted,
            nModified,
            nRemoved,
          } = await coll.bulkWrite(ops);

          const changes = nInserted + nUpserted + nModified + nRemoved;

          const updateVersion = {
            updateOne: {
              filter: {
                aggregate: aggregateName,
                __pv: pv,
                __v: { $lt: version },
              },
              update: {
                $set: { __v: version },
                $currentDate: { last_snapshot_time: { $type: 'date' } },
              },
              upsert: true,
            },
          };

          db.collection('versions').bulkWrite([updateVersion]);

          return changes;
        })
      )(collections[aggregateName]);

      const r = await Promise.all(promises);

      return sum(r);
    });

    const changes = sum(await Promise.all(promises));
    return {
      __v: version,
      changes,
    };
  };
}
