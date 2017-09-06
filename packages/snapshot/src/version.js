const resolvePlugin = require('./resolvePlugin');

module.exports = version;

async function version(input, write) {
  const m = resolvePlugin(input, write);

  const version = await m.version(input);

  process.stdout.write(String(version));
  process.exit(0);
}
