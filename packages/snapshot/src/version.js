const { URL } = require('url');
const path = require('path');

module.exports = version;

const packageByProtocol = {
  'mongodb:': '@events/snapshot-mongo',
};

async function version(input, write) {
  const datasource = input._[0];

  if (!datasource) {
    write(`please specific a datasource\nsnapshot version [datasource]`);
    throw new Error('no datasource');
  }

  const url = new URL(datasource);

  if (!url.protocol) {
    write(`please specific a protocol in datasource`);
    throw new Error('no protocol');
  }

  const moduleName = packageByProtocol[url.protocol];
  if (!moduleName) {
    write(`${url.protocol} is unknown`);
    throw new Error('unknown protocol');
  }

  let m;

  try {
    m = require(moduleName);
  } catch (ex) {
    write(`cannot resolve package ${moduleName} from ${process.cwd()}. Make sure you install it by:
    npm install ${moduleName}
    OR
    yarn add ${moduleName}
`);
    throw new Error('module not found');
  }

  const version = await m.version(input);

  process.stdout.write(String(version));
}
