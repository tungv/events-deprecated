const resolvePlugin = require('./resolvePlugin');
const readJSONStream = require('kefir-stdin-json');

module.exports = persist;

async function persist(input, write) {
  const m = resolvePlugin(input, write);

  const stream = await m.persist(input, readJSONStream(process.stdin));
  stream.onEnd(process.exit.bind(0));
}
