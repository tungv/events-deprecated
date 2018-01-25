import execa from 'execa';
import got from 'got';

import { MongoClient } from 'mongodb';
import path from 'path';

import startServer from '../fixtures/startServer';

const subscribe = async ({
  loglevel = 'DEBUG',
  configPath,
  json = true,
  keepAlive,
}) => {
  const child = execa('node', ['-r', 'babel-register', './src/subscribe'], {
    env: {
      params: JSON.stringify({
        json,
        verbose: loglevel,
        configPath: path.resolve(process.cwd(), configPath),
      }),
    },
  });

  setTimeout(() => {
    child.kill('SIGINT');
  }, keepAlive);

  const { stdout, stderr } = await child;

  if (stderr) {
    throw stderr;
  }

  return { stdout };
};

const normalize = array =>
  array.map(item => {
    try {
      const obj = JSON.parse(item.split(process.cwd()).join('<ROOT>'));
      delete obj._t;

      return obj;
    } catch (ex) {
      console.error(item);
      throw ex;
    }
  });

describe('heq-client subscribe', () => {
  let server;
  let db;

  beforeAll(async () => {
    server = await startServer({
      redis: 'redis://localhost:6379/6',
      port: 43366,
      namespc: 'client-e2e-test',
      clean: true,
    });

    const seedingEvents = require('../fixtures/seeding-events');

    for (const event of seedingEvents) {
      await got.post(`http://localhost:43366/commit`, {
        body: event,
        json: true,
      });
    }

    db = await MongoClient.connect(process.env.MONGO_TEST);
    await db.dropDatabase();
  });

  afterAll(() => {
    server.close();
  });

  it('should log', async () => {
    const { stdout } = await subscribe({
      configPath: './fixtures/config/test.config.js',
      keepAlive: 2000,
    });

    const appEvents = normalize(stdout.split('\n'));

    expect(appEvents.map(e => e.type)).toMatchSnapshot('app events sequence');

    appEvents.filter(e => e.type === 'incoming-event').forEach((e, index) => {
      expect(e.payload.event.id).toBe(index + 1);
      expect(e).toMatchSnapshot(`incoming-event ${index + 1} must match`);
    });

    appEvents.filter(e => e.type === 'subscription-catchup').forEach(e => {
      expect(e.payload.count).toBe(9);
    });

    const users = await db
      .collection('users_v1.0.0')
      .find()
      .toArray();

    const departments = await db
      .collection('departments_v1.0.0')
      .find()
      .toArray();

    expect(users.map(({ _id, ...user }) => user)).toMatchSnapshot(
      'users collection must match',
    );
    expect(
      departments.map(({ _id, ...department }) => department),
    ).toMatchSnapshot('departments collection must match');
  });
});
