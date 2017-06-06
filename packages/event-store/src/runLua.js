/* @flow */
import promisify from 'es6-promisify';

type EvalParams = {
  keys: ?(string[]),
  argv: ?(string[]),
};

type RunLua = (any, string, EvalParams) => Promise<any>;

const runLua: RunLua = promisify(
  (redisClient, luaScript: string, { keys, argv }: EvalParams, cb) => {
    const nonEmptyKeys = keys || [];
    const nonEmptyArgv = argv || [];

    return redisClient.eval(
      luaScript,
      nonEmptyKeys.length,
      ...nonEmptyKeys,
      ...nonEmptyArgv,
      cb
    );
  }
);

export default runLua;
