import makeTransform, { getMeta } from '@events/transform';

import path from 'path';

import { setLogLevel, write } from './logger';
import loadModule from './utils/loadModule';
import parseConfig from './utils/parseConfig';

const { params } = process.env;

const { json, verbose, configPath } = JSON.parse(params);

setLogLevel(verbose);

prepare().then(loop, handleErrors);

async function prepare() {
  write('INFO', {
    type: 'load-config-begin',
    payload: {
      path: configPath,
    },
  });

  const configDir = path.resolve(configPath, '..');
  const config = await parseConfig(require(configPath), configDir);

  write('DEBUG', {
    type: 'load-config-end',
    payload: {
      config,
    },
  });

  const { transform: { rulePath } } = config;

  write('DEBUG', {
    type: 'load-transform-begin',
    payload: {
      rulePath,
    },
  });

  const rules = loadModule(rulePath);

  const transform = makeTransform(rules);
  const ruleMeta = getMeta(rules);

  write('DEBUG', {
    type: 'load-transform-end',
    payload: {
      ruleMeta,
    },
  });

  return { config, ruleMeta };
}

async function loop({ config }) {}

async function handleErrors(ex) {
  console.error(ex);
  process.exit(1);
}
