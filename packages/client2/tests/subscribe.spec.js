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

  beforeAll(async () => {
    server = await startServer({
      redis: 'redis://localhost:6379/6',
      port: 43366,
      namespc: 'client-e2e-test',
      clean: true,
    });

    const seedingEvents = require('../fixtures/seeding-events');

    await Promise.all(
      seedingEvents.map(event => {
        return got.post(`http://localhost:43366/commit`, {
          body: event,
          json: true,
        });
      }),
    );

    const db = await MongoClient.connect(process.env.MONGO_TEST);
    await db.dropDatabase();
  });

  afterAll(() => {
    server.close();
  });

  it('should log', async () => {
    const { stdout } = await subscribe({
      configPath: './fixtures/config/test.config.js',
      keepAlive: 1000,
    });

    const appEvents = normalize(stdout.split('\n'));

    expect(appEvents).toMatchSnapshot();

    console.log(appEvents.map(e => e.type));
  });
});
