/* @flow */
import kefir from 'kefir';
import once from 'lodash/fp/once';
import range from 'lodash/fp/range';

import type { SubscribeConfig } from '../types/Config.type';
import { createClient } from './redis-client';
import { query } from './query';

const tryParse = raw => {
  try {
    return JSON.parse(raw);
  } catch (ex) {
    return { type: '@@RAW', payload: raw };
  }
};

function flush(response) {
  if (response.flush && response.flush.name !== 'deprecated') {
    response.flush();
  }
}

const toOutput = events => `id: ${events[0].id}
event: INCMSG
data: ${JSON.stringify(events)}

`;

export default ({ redis, history, debug, namespc, burst }: SubscribeConfig) => {
  const subClient = createClient(redis);
  const queryClient = createClient(redis);

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

  const message$ = kefir
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
      .bufferWithTimeOrCount(burst.time, burst.count)
      .filter(b => b.length)
      .map(toOutput)
      .observe(block => {
        debug && console.log('send to %s %s', req.url, block);
        res.write(block);
      });

    const removeClient = once(() => {
      debug && console.log('removing', req.url);
      subscription.unsubscribe();
      res.end();
    });

    req.on('end', removeClient);
    req.on('close', removeClient);
    res.on('finish', removeClient);
  };

  const getInitialValues = lastEventId => {
    if (!lastEventId) {
      return kefir.never();
    }

    // history[0] is the latest id
    const current = list[0];
    const oldestInCache = list[list.length - 1];

    debug && console.log('current', current);
    if (oldestInCache <= lastEventId + 1) {
      return kefir
        .constant(range(lastEventId + 1, current).map(id => cache[id]))
        .flatten();
    }

    debug && console.error('too old, getting more from redis');
    const fromCache$ = kefir
      .constant(range(oldestInCache, current + 1).map(id => cache[id]))

    const fromRedis$ = kefir
      .fromPromise(
        query(queryClient, namespc, lastEventId + 1, oldestInCache - 1)
      );

    return kefir.concat([fromRedis$, fromCache$]).flatten();
  };

  const service = async (req: any, res: any) => {
    try {
      debug && console.log('connected', req.url);
      const lastEventId = Number(req.headers['last-event-id']);

      const initialValues = getInitialValues(lastEventId);

      debug && console.log('lastEventId', lastEventId);

      // const url = req.url;
      // const query = parse(url.split('?')[1]);

      addClient(
        kefir.concat([initialValues, message$]),
        {},
        {},
        req,
        res
      );
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  };

  subClient.subscribe(`${namespc}::events`);

  return {
    service,
    unsubscribe: () => {
      console.log('unsubscribing from redis');
      subClient.unsubscribe(`${namespc}::events`);
    },
  };
};
