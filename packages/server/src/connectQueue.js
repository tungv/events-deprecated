import kefir from 'kefir';
import { range } from 'lodash/fp';

import type { SubscribeConfig } from '../types/Config.type';
import { createClient } from './redis-client';
import { tryParse } from './utils';
import { query } from './query';

export default ({ redis, history, debug, namespc }: SubscribeConfig) => {
  const subClient = createClient(redis);
  const queryClient = createClient(redis);

  subClient.subscribe(`${namespc}::events`);

  // prepare cache
  const MAX_SIZE = history.size;
  const list = [];
  const cache = {};

  const addToCache = message => {
    debug && console.log('adding to cache', message.id);

    const newSize = list.unshift(message.id);
    cache[message.id] = message;

    if (newSize > MAX_SIZE) {
      const expired = list.splice(MAX_SIZE);
      expired.forEach(removingId => {
        delete cache[removingId];
      });
    }

    debug && console.log('HISTORY', list);
    debug && console.log('CACHE\n', cache);
  };

  const realtimeMessage$ = kefir
    .fromEvents(subClient, 'message', (channel, message) => message)
    .map(message => {
      const rawId = message.split(':')[0];
      const id = Number(rawId);
      const rawEvent = message.slice(rawId.length + 1);

      return {
        id,
        ...tryParse(rawEvent),
      };
    })
    .onValue(addToCache);

  const getInitialMessage$ = lastEventId => {
    if (isNaN(lastEventId)) {
      return kefir.never();
    }

    // history[0] is the latest id
    const current = list[0];
    const oldestInCache = list[list.length - 1];

    debug && console.log('current', current);
    debug && console.log('oldestInCache', oldestInCache);
    if (oldestInCache <= lastEventId + 1) {
      return kefir
        .constant(range(lastEventId + 1, current + 1).map(id => cache[id]))
        .flatten();
    }

    debug && console.error('too old, getting more from redis');
    const fromCache$ = kefir.constant(
      range(oldestInCache, current + 1).map(id => cache[id])
    );

    const promise = list.length
      ? query(queryClient, namespc, lastEventId, oldestInCache - 1)
      : query(queryClient, namespc, lastEventId);

    const fromRedis$ = kefir.fromPromise(promise);

    return kefir.concat([fromRedis$, fromCache$]).flatten();
  };

  const unsubscribe = () => {
    debug && console.log('unsubscribing from redis');
    subClient.unsubscribe(`${namespc}::events`);
  };

  return { realtimeMessage$, getInitialMessage$, unsubscribe };
};
