/* @flow */
import { createClient, RedisClientType } from './redis-client';

import type { CommitConfig } from '../types/Config.type';
import runLua from './runLua';

const queryLua = `
local function getKeys(from, to, key)
  local newArray = {};
  for id=from,to do
    table.insert(newArray, {id, redis.call('hget', key, id)});
  end

  return newArray
end

local from = tonumber(ARGV[1]);
local to = tonumber(ARGV[2]) or redis.call('HLEN', KEYS[1]);

return getKeys(from, to, KEYS[1])
`;

export const query = async (client: RedisClientType, namespc: string, ...argv: number[]) => {
  const array = await runLua(client, queryLua, {
    keys: [`${namespc}::events`],
    argv: argv.map(String),
  });

  return array.map(([id, event]) => ({
    id,
    ...JSON.parse(event),
  }));
};

export default (config: CommitConfig) => {
  const client = createClient(config.redis);

  return async (req: any) => {
    const lastEventId = Number(req.headers['Last-Event-ID'] || req.query.lastEventId);
    const events = await query(client, config.namespc, lastEventId);

    // we trust the input from commit. otherwise we have to do a try-parse
    return events;
  };
};
