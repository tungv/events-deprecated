import execa from 'execa';
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
    });
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
