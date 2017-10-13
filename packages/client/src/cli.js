#!/bin/node
const mri = require('mri');
const main = require('./index');
const path = require('path');
const pkgDir = require('pkg-dir');
const makeShouldLog = require('./should-log');
const parseConfig = require('./parseConfig');

const input = mri(process.argv.slice(2), {
  alias: {
    c: 'config',
    x: 'logLevel',
  },
  default: {
    config: './events.config.js',
    logLevel: 'INFO',
  },
});

const configPath = input.config;

(async () => {
  const rootDir = await pkgDir();
  const configAbsPath = require.resolve(path.resolve(rootDir, configPath));
  const configDir = path.resolve(configAbsPath, '..');
  const shouldLog = makeShouldLog(input.logLevel);

  if (shouldLog('INFO')) {
    console.info('loading config from `%s`', configAbsPath);
  }

  const config = require(configAbsPath);
  if (shouldLog('SILLY')) {
    console.log('config content', JSON.stringify(config, null, 2));
  }

  const finalConfig = await parseConfig(config, configDir);
  if (shouldLog('DEBUG')) {
    console.log(
      'normalized config content',
      JSON.stringify(finalConfig, null, 2)
    );
  }

  const out$ = main(finalConfig);
  out$.observe(p => {
    console.log('---', p);
  });
})();
