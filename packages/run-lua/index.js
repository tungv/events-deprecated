const { promisify } = require('es6-promisify');
const crypto = require('crypto');

const sha1 = text => {
  const hash = crypto.createHash('sha1');
  return hash.update(text).digest('hex');
};

const map = new Map();

const runLua = promisify((redisClient, luaScript, { keys, argv }, cb) => {
  const nonEmptyKeys = keys || [];
  const nonEmptyArgv = argv || [];

  const hashOrNull = map.get(luaScript);
  if (hashOrNull) {
    return redisClient.evalsha(
      hashOrNull,
      nonEmptyKeys.length,
      ...nonEmptyKeys,
      ...nonEmptyArgv,
      cb
    );
  }

  return redisClient.eval(
    luaScript,
    nonEmptyKeys.length,
    ...nonEmptyKeys,
    ...nonEmptyArgv,
    (err, val) => {
      if (!err) {
        const hash = sha1(luaScript);
        map.set(luaScript, hash);
      }

      cb(err, val);
    }
  );
});

module.exports = runLua;
