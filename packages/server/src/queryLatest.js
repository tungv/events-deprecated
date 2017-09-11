/* @flow */
import { createClient, RedisClientType } from './redis-client';

import type { CommitConfig } from '../types/Config.type';
import runLua from './runLua';

const getLatestEventLua = `
local latestId = redis.call('get', KEYS[1]);

if not latestId then
  return {
    id = nil,
    event = nil
  }
end

local latestEvent = redis.call('hget', KEYS[2], latestId);

return {
  latestId,
  latestEvent
};
`;

export const queryLatest = async (client: RedisClientType, namespc: string) => {
  const [id, event] = await runLua(client, getLatestEventLua, {
    keys: [`{${namespc}}::id`, `{${namespc}}::events`],
    argv: [],
  });

  if (!id || !event) {
    return {};
  }

  return {
    id: Number(id),
    ...JSON.parse(event),
  };
};

export default (config: CommitConfig) => {
  const client = createClient(config.redis);

  return () => queryLatest(client, config.namespc);
};
