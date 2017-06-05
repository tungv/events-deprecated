/* @flow */
import { createError } from 'micro-boom';
import { json } from 'micro';
import redis from 'redis';

import type { CommitConfig } from '../types/Config.type';
import { createClient } from './redis-client';
import runLua from './runLua';

type Event = {
  type: string,
  payload: mixed,
};

const commit = async (redisClient, event: Event, namespc) => {
  const lua = `
    local event = ARGV[1];
    local counter = redis.call('HLEN', KEYS[1]) + 1;

    redis.call('HSET', KEYS[1], counter, event);
    redis.call('PUBLISH', ARGV[2]..'::events', counter .. ':' .. event);
    return counter;
  `;

  return runLua(redisClient, lua, {
    keys: [`${namespc}::events`],
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
