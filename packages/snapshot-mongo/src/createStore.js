/* @flow */
import { sum, flatten, flow, map, set } from 'lodash/fp';

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
    ).map(async collectionName => {
      const coll = db.collection(collectionName);

      const ops = flow(
        map((cmd: Command<*>) => mapToOperation(version, cmd)),
        flatten
      )(collections[collectionName]);

      if (ops.length === 0) {
        return 0;
      }

      const {
        nInserted,
        nUpserted,
        nModified,
        nRemoved,
      } = await coll.bulkWrite(ops);
      return nInserted + nUpserted + nModified + nRemoved;
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
