import loadConfig from '../loadConfig';

describe('helpers: loadConfig', () => {
  it('should load file specified by --config', () => {
    const conf = loadConfig({ config: 'tests/fixtures/heq.config.js' });
    expect(conf).toMatchSnapshot('bare config from file');
  });

  it('should load file and let cli opts override it', () => {
    const conf = loadConfig({
      config: 'tests/fixtures/heq.config.js',
      name: 'override',
      workers: 0,
    });

    expect(conf).toMatchSnapshot('cli options override bare config from file');
  });
});
