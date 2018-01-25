import execa from 'execa';
import path from 'path';

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

  const { stdout } = await child;
  return { stdout };
};

const normalize = array =>
  array.map(item => {
    const obj = JSON.parse(item.split(process.cwd()).join('<ROOT>'));
    delete obj._t;

    return obj;
  });

describe('heq-client subscribe', () => {
  it('should log', async () => {
    const { stdout } = await subscribe({
      configPath: './fixtures/config/sample.config.js',
    });

    expect(normalize(stdout.split('\n'))).toMatchSnapshot();
  });
});
