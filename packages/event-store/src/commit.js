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

const commit = async (redisClient, event: Event) => {
  const lua = `
    local event = ARGV[1];
    local counter = redis.call('HLEN', KEYS[1]) + 1;

    redis.call('HSET', KEYS[1], counter, event);
    redis.call('PUBLISH', 'events', counter .. ':' .. event);
    return counter;
  `;

  return runLua(redisClient, lua, {
    keys: ['events'],
    argv: [JSON.stringify(event)],
  });
};


export default ({ redis }: CommitConfig) => {
  const client = createClient(redis);

  return async (req: any) => {
    const event = await json(req);

    if (typeof event.type !== 'string') {
      throw createError(422, 'Missing type');
    }

    const id = await commit(client, event);

    return { ...event, id };
  };

}
