import parseConfig from './utils/parseConfig';
import path from 'path';
import { setLogLevel, write } from './logger';

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
}

async function loop() {}

async function handleErrors(ex) {
  console.log(ex);
}
