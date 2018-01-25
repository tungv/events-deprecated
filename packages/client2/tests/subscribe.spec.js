import execa from 'execa';
import path from 'path';
import startServer from '../fixtures/startServer';

const subscribe = async ({ loglevel = 'DEBUG', configPath, json = true }) => {
  const child = execa('node', ['-r', 'babel-register', './src/subscribe'], {
    env: {
      params: JSON.stringify({
        json,
        verbose: loglevel,
        configPath: path.resolve(process.cwd(), configPath),
      }),
    },
  });

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
    });

    expect(normalize(stdout.split('\n'))).toMatchSnapshot();
  });
});
