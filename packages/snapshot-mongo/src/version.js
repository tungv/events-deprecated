#!/usr/bin/env node
/* @flow */
/* eslint-disable no-console */
import { MongoClient } from 'mongodb';
import { pathOr } from 'lodash/fp';
import mri from 'mri';
import path from 'path';

type Args = {
  _: [string],
  seed: string,
  debug: boolean,
};

type Collection = {
  drop: (query: any) => Promise<void>,
  insertMany: (Array<any>) => Promise<void>,
};
type DB = {
  close: () => void,
  collection: string => Collection,
};
type SnapshotAndDB = { snapshotVersion: number, db: DB };

export default (async function getLatest(args: Args) {
  const mongoUrl = args._[0];
  const initialValuesJSONPath = args.seed;
  const debugMode = args.debug;

  const write = (...args) => {
    debugMode && console.error('[SNAPSHOT] ', ...args);
  };

  const { db, snapshotVersion } = await connect(mongoUrl, write);

  write(`snapshot_version: ${snapshotVersion || 0}`);

  if (snapshotVersion === 0 && args.seed) {
    write('5. seeding...');

    // $FlowFixMe: this can be a JSON file or any JS file
    const initialValues = require(path.resolve(
      process.cwd(),
      initialValuesJSONPath
    ));

    const promises = Object.keys(
      initialValues
    ).map(async (collectionName, index) => {
      const coll = db.collection(collectionName);
      write(
        `5.${index + 1}. collection: ${collectionName} - ${initialValues[
          collectionName
        ].length} documents`
      );
      try {
        await coll.drop({});
      } catch (ex) {
        // nothing
      }
      await coll.insertMany(initialValues[collectionName]);
      write(`5.${index + 1}. seeding ${collectionName} completed!`);
    });

    await Promise.all(promises);
    write('6. seeded!');
  }

  return snapshotVersion || 0;
});

async function connect(
  url: ?string,
  write: string => void
): Promise<SnapshotAndDB> {
  if (typeof url !== 'string' || url.length === 0) {
    process.exit(1);
    // $FlowFixMe process will exit forcefully
    return {};
  }

  write(`1. connecting to mongo ${url}...`);
  const db = await MongoClient.connect(url);
  write('2. connected!');

  const versionsColl = db.collection('versions');

  write('3. verifying versions...');
  const versionDoc = await versionsColl.findOne({ _id: '@events/version' });

  if (!versionDoc) {
    await versionsColl.insert({ _id: '@events/version', snapshot_version: 0 });
  }

  const snapshotVersion = pathOr(0, 'snapshot_version', versionDoc);

  write(`4. verified`);

  return {
    db,
    snapshotVersion,
  };
}
