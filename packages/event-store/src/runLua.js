/* @flow */
import promisify from 'es6-promisify';

type EvalParams = {
  keys: ?string[],
  argv: ?string[],
};

type RunLua = (any, string, EvalParams) => Promise<any>;

const runLua: RunLua = promisify((redisClient, luaScript: string, { keys, argv }: EvalParams, cb) => {
  return redisClient.eval(luaScript, (keys || []).length, ...keys, ...argv, cb);
})

export default runLua;
