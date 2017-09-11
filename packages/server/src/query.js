/* @flow */
import { createClient, RedisClientType } from './redis-client';

import type { CommitConfig } from '../types/Config.type';
import runLua from './runLua';

const queryLua = `
if redis.call('exists', KEYS[1]) == 0 then
  redis.call('set', KEYS[1], 0);
end

local from = tonumber(ARGV[1]) + 1;
local to = tonumber(
  ARGV[2] or redis.call('get', KEYS[1])
);
local newArray = {};

for id=from,to do
  table.insert(newArray, {id, redis.call('hget', KEYS[2], id)});
end

return newArray
`;

export const query = async (
  client: RedisClientType,
  namespc: string,
  ...argv: number[]
) => {
  try {
    const array = await runLua(client, queryLua, {
      keys: [`{${namespc}}::id`, `{${namespc}}::events`],
      argv: argv.map(String),
    });

    return array.map(([id, event]) => ({
      id,
      ...JSON.parse(event),
    }));
  } catch (ex) {
    console.error(ex);
    return [];
  }
};

export default (config: CommitConfig) => {
  const client = createClient(config.redis);

  return async (req: any) => {
    const lastEventId = Number(
      req.headers['Last-Event-ID'] || req.query.lastEventId
    );
    const events = await query(client, config.namespc, lastEventId);

    // we trust the input from commit. otherwise we have to do a try-parse
    return events;
  };
};
