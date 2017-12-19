import MongoHeartbeat from 'mongo-heartbeat';
import { MongoClient } from 'mongodb';

export default async url => {
  try {
    const db = await MongoClient.connect(url);
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

    return db;
  } catch (ex) {
    console.error(ex);
    process.exit(1);
  }
};
