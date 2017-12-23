import path from 'path';
import fs from 'fs';

const loadConfig = ({ config, name, redis, port, workers }) => {
  const configValues = tryParseConfig(config);
  const cliOpts = {};

  if (typeof name !== 'undefined') cliOpts.name = name;
  if (typeof redis !== 'undefined') cliOpts.redis = redis;
  if (typeof port !== 'undefined') cliOpts.port = parseInt(port);
  if (typeof workers !== 'undefined') cliOpts.workers = parseInt(workers);

  const fv = Object.assign(configValues, cliOpts);
  return fv;
};

const tryParseConfig = configFilePath => {
  const absPath = path.resolve(process.cwd(), configFilePath);
  const stats = fs.statSync(absPath);

  try {
    const config = require(absPath);
    return config;
  } catch (ex) {
    console.error(ex);
  }
};

export default loadConfig;
