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
    const { changes, where } = cmd.op.update;
    const update = set('$set.__v', version, changes);
    const filter = set('__v.$lt', version, where);
    return [
      {
        updateMany: {
          filter,
          update,
        },
      },
    ];
  }

  return [];
}

export default function createStore(db: DB) {
  return async function dispatch(request: UpdateRequest): Promise<number> {
    const { __v: version, ...collections } = request;
    const promises: Array<Promise<number>> = Object.keys(
      collections
    ).map(async aggregationName => {
      const promises = flow(
        groupBy('__pv'),
        toPairs,
        map(([pv, cmdArray]: [string, Command<*>[]]) => [
          `${aggregationName}_v${pv.split('.').join('_')}`,
          flow(map(cmd => mapToOperation(version, cmd)), flatten)(cmdArray),
        ]),
        filter(path('1.length')),
        map(async ([collectionName, ops]) => {
          const coll = db.collection(collectionName);
          const {
            nInserted,
            nUpserted,
            nModified,
            nRemoved,
          } = await coll.bulkWrite(ops);
          return nInserted + nUpserted + nModified + nRemoved;
        })
      )(collections[aggregationName]);

      const r = await Promise.all(promises);

      return sum(r);
    });

    const changes = sum(await Promise.all(promises));

    // update versions
    await db.collection('versions').findOneAndUpdate(
      {
        _id: '@events/version',
      },
      {
        $set: { snapshot_version: version },
      },
      { upsert: true }
    );

    return changes;
  };
}
