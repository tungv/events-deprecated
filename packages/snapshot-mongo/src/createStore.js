/* @flow */
import { sum, flatten, flow, map, set } from 'lodash/fp';

export function mapToOperation<Doc>(
  version: number,
  cmd: Command<Doc>
): Operation<Doc>[] {
  if (cmd.insert) {
    return cmd.insert.map(doc => {
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

  if (cmd.update) {
    const changes = set('$set.__v', version, cmd.update.changes);
    return [
      {
        updateMany: {
          filter: {
            ...cmd.update.where,
            __v: { $lt: version },
          },
          update: changes,
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
    ).map(async collectionName => {
      const coll = db.collection(collectionName);

      const ops = flow(
        map((cmd: Command<*>) => mapToOperation(version, cmd)),
        flatten
      )(collections[collectionName]);

      const {
        nInserted,
        nUpserted,
        nModified,
        nRemoved,
      } = await coll.bulkWrite(ops);

      return nInserted + nUpserted + nModified + nRemoved;
    });

    return sum(await Promise.all(promises));
  };
}
