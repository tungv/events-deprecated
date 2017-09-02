/* @flow */
import { over } from 'lodash/fp';
import kefir from 'kefir';
import once from 'lodash/fp/once';
import range from 'lodash/fp/range';

import type { SubscribeConfig } from '../types/Config.type';
import { createClient } from './redis-client';
import {
  getBurstCount,
  getBurstTime,
  getLastEventId,
  getRetry,
  tryParse,
} from './utils';
import { query } from './query';

function flush(response) {
  if (response.flush && response.flush.name !== 'deprecated') {
    response.flush();
  }
}

const toOutput = events => `id: ${events[events.length - 1].id}
event: INCMSG
data: ${JSON.stringify(events)}

`;

const getMessage$ = ({ redis, history, debug, namespc }: SubscribeConfig) => {
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

const addClient = (src, opts, match, req, res) => {
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream;charset=UTF-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(':ok\n\n');

  // cast to integer
  const retry = opts.retry | 0;

  if (retry) {
    res.write('retry: ' + retry + '\n');
  }

  flush(res);

  const subscription = src
    .filter(x => x)
    .bufferWithTimeOrCount(opts.time, opts.count)
    .filter(b => b.length)
    .map(toOutput)
    .observe(block => {
      opts.debug && console.log('send to %s %s', req.url, block);
      res.write(block);
    });

  const removeClient = once(() => {
    opts.debug && console.log('removing', req.url);
    subscription.unsubscribe();
    res.end();
  });

  req.on('end', removeClient);
  req.on('close', removeClient);
  res.on('finish', removeClient);
};

export default (config: SubscribeConfig) => {
  const { realtimeMessage$, getInitialMessage$, unsubscribe } = getMessage$(
    config
  );

  const service = async (req: any, res: any) => {
    try {
      config.debug && console.log('connected', req.url);
      const [lastEventId, count, time, retry] = over([
        getLastEventId,
        getBurstCount,
        getBurstTime,
        getRetry,
      ])(req);

      config.debug && console.log('lastEventId', lastEventId);
      const initialValues = getInitialMessage$(lastEventId);

      addClient(
        kefir.concat([initialValues, realtimeMessage$]),
        {
          count,
          time,
          retry,
          debug: config.debug,
        },
        {}, // query
        req,
        res
      );
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  };

  return {
    service,
    unsubscribe,
  };
};
