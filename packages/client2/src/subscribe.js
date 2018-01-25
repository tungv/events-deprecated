import parseConfig from './utils/parseConfig';
import path from 'path';
const { params } = process.env;

const { json, verbose, configPath } = JSON.parse(params);

prepare().then(loop, handleErrors);

async function prepare() {
  console.log('prepare');
  const configDir = path.resolve(configPath, '..');
  const config = await parseConfig(require(configPath), configDir);

  console.log(require('util').inspect(config, { depth: null }));
}

async function loop() {}

async function handleErrors(ex) {
  console.log(ex);
}
