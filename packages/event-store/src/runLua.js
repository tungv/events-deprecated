/* @flow */
import promisify from 'es6-promisify';
import crypto from 'crypto';

type EvalParams = {
  keys: ?(string[]),
  argv: ?(string[]),
};

type RunLua = (any, string, EvalParams) => Promise<any>;

const sha1 = (text: string): string => {
  const hash = crypto.createHash('sha1');
  return hash.update(text).digest('hex');
};

const map = new Map();

const runLua: RunLua = promisify(
  (redisClient, luaScript: string, { keys, argv }: EvalParams, cb) => {
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
  }
);

export default runLua;
