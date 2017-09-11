/* @flow */
import { createError } from 'micro-boom';
import { json } from 'micro';
import redis from 'redis';

import type { CommitConfig } from '../types/Config.type';
import { createClient, RedisClientType } from './redis-client';
import runLua from './runLua';

type Event = {
  type: string,
  payload: mixed,
};

export const commit = async (redisClient: RedisClientType, event: Event, namespc: string) => {
  const lua = `
    local event = ARGV[1];
    local counter = redis.call('INCR', KEYS[1]);

    redis.call('HSET', KEYS[2], counter, event);
    redis.call('PUBLISH', ARGV[2]..'::events', counter .. ':' .. event);
    return counter;
  `;

  return runLua(redisClient, lua, {
    keys: [`{${namespc}}::id`, `{${namespc}}::events`],
    argv: [JSON.stringify(event), namespc],
  });
};


export default ({ redis, namespc }: CommitConfig) => {
  const client = createClient(redis);

  return async (req: any) => {
    const event = await json(req);

    if (typeof event.type !== 'string') {
      throw createError(422, 'Missing type');
    }

    const id = await commit(client, event, namespc);

    return { ...event, id };
  };

}
