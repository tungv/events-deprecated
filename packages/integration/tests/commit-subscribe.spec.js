const execa = require('execa');
const request = require('request-promise');
const { delay } = require('awaiting');
const padStream = require('pad-stream');
const path = require('path');
const del = require('redis-functional/del');
const redis = require('redis');
const { MongoClient } = require('mongodb');

const {
  REDIS_URL = 'redis://localhost:6379/1',
  MONGODB_URL = 'mongodb://localhost:27017/integration-test',
  ES_SERVER_PORT = '43322',
} = process.env;

const subCliBinPath = './node_modules/.bin/subscribe';
const transformBinPath = './node_modules/.bin/transform';
const snapshotBinPath = './node_modules/.bin/snapshot';

const givePermissionAndExecute = async (bin, ...args) => {
  await execa('chmod', ['+x', bin]);
  return execa(bin, ...args);
};

const clean = async (namespace = 'integration-test') => {
  const client = redis.createClient(REDIS_URL);
  await del(client, `{${namespace}}::id`);
  await del(client, `{${namespace}}::events`);
  const db = await MongoClient.connect(MONGODB_URL);

  try {
    await db.dropDatabase({});
  } catch (ex) {
    // nothing
  }
};

describe('commit and subscribe', () => {
  it('should work', async () => {
    await clean();
    const client = redis.createClient(REDIS_URL);

    await execa('chmod', ['+x', subCliBinPath]);
    await execa('chmod', ['+x', transformBinPath]);
    await execa('chmod', ['+x', snapshotBinPath]);

    const subProcess = execa('subscribe', [
      `http://localhost:${ES_SERVER_PORT}`,
      '--last',
      '0',
      '--burstTime',
      '20',
      '--burstCount',
      '10',
    ]);

    const transformProcess = execa('transform', [
      './fixtures/rules/user_management.js',
    ]);

    const snapshotProcess = execa('snapshot', ['persist', MONGODB_URL]);

    subProcess.stdout.pipe(transformProcess.stdin);
    transformProcess.stdout.pipe(snapshotProcess.stdin);

    const events = [
      {
        type: 'USER_REGISTERED',
        payload: {
          uid: '9d5901c0-4228-4832-adb2-41cb3a8797cd',
          email: 'abc@events.com',
          name: 'ABC',
          age: 21,
        },
        meta: {
          client: 'test-commiter-1',
          clientVersion: '1.0.0',
          occurredAt: 1505728418175,
        },
      },
      {
        type: 'USER_REGISTERED',
        payload: {
          uid: '6d90bd42-62ef-4d3c-91aa-6f517fdcc8da',
          email: 'def@events.com',
          name: 'DEF',
          age: 23,
        },
        meta: {
          client: 'test-commiter-1',
          clientVersion: '1.0.0',
          occurredAt: 1505728521586,
        },
      },
      {
        type: 'USER_EMAIL_UPDATED',
        payload: {
          uid: '9d5901c0-4228-4832-adb2-41cb3a8797cd',
          email: 'newemail@events.com',
        },
        meta: {
          client: 'test-commiter-1',
          clientVersion: '1.0.0',
          occurredAt: 1505728523586,
        },
      },
      {
        type: 'USER_REGISTERED',
        payload: {
          uid: '3822c08a-2967-40bb-8c99-d3c76b569561',
          email: 'ghi@events.com',
          name: 'GHI',
          age: 27,
        },
        meta: {
          client: 'test-commiter-1',
          clientVersion: '1.0.0',
          occurredAt: 1505728528648,
        },
      },
    ];

    for (const ev of events) {
      await request(`http://localhost:${ES_SERVER_PORT}/commit`, {
        method: 'POST',
        json: ev,
      });
    }

    await delay(1000);

    snapshotProcess.kill('SIGINT');

    const db = await MongoClient.connect(MONGODB_URL);
    const users = await db
      .collection('users_v1.0.0')
      .find({})
      .toArray();

    expect(users).toHaveLength(3);
    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: '9d5901c0-4228-4832-adb2-41cb3a8797cd',
          __v: 3,
          email: 'newemail@events.com',
          name: 'ABC',
          age: 21,
        }),
        expect.objectContaining({
          uid: '6d90bd42-62ef-4d3c-91aa-6f517fdcc8da',
          __v: 2,
          email: 'def@events.com',
          name: 'DEF',
          age: 23,
        }),
        expect.objectContaining({
          uid: '3822c08a-2967-40bb-8c99-d3c76b569561',
          __v: 4,
          email: 'ghi@events.com',
          name: 'GHI',
          age: 27,
        }),
      ])
    );
  });
});
