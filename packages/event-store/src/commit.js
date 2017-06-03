/* @flow */
import { createError } from 'micro-boom';
import { json } from 'micro';
import redis from 'redis';

import runLua from './runLua';

type Event = {
  type: string,
  payload: mixed,
};

const client = redis.createClient();

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

type TransformFunction = (any, http$IncomingMessage) => Event;

export default (transformReq: TransformFunction) => async (req: any) => {
  const body = await json(req);
  const event = transformReq(body, req);

  if (typeof event.type !== 'string') {
    throw createError(422, 'Missing type');
  }

  const id = await commit(client, event);

  return { ...event, id };
};
