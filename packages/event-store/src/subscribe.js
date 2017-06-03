/* @flow */
import kefir from 'kefir';
import mitt from 'mitt';
import once from 'lodash/fp/once';

import { parse } from 'querystring';

import { createClient } from './redis-client';

type RedisAddress =
  | {}
  | { port: number, host: string, family?: 'IPv6' | 'IPv4' }
  | { path: string }
  | { url: string }

type RedisConfig = {
  enable_offline_queue?: boolean,
  socket_keepalive?: boolean,
  string_numbers?: boolean,
  return_buffers?: boolean,
  enable_offline_queue?: boolean,
  no_ready_check?: boolean,
  retry_unfulfilled_commands?: boolean,
  disable_resubscribing?: boolean,
  prefix?: string,
  password?: string,
  db?: number,
  rename_commands?: { [string]: string },
  retry_strategy?: ({ attempt: number, total_retry_time: number, error: Error, times_connected: number }) => number,
} & RedisAddress;

type SubscribeEndpointParams = {
  redis?: RedisConfig,
  history: {
    size: number
  },
  debug?: boolean
}

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

const toOutput = event => `id: ${event.id}
event: INCMSG
data: ${JSON.stringify(event)}

`;

export default ({ redis, history, debug }: SubscribeEndpointParams) => {
  const subClient = createClient(redis);

  // prepare cache
  const MAX_SIZE = history.size;
  const list = [];
  const cache = {};

  const addToCache = message => {
    debug && console.log('adding to cache', message.id);

    const newSize = list.unshift(message.id);
    cache[message.id] = message;

    debug && console.log('HISTORY', list);
    debug && console.log('CACHE', cache);

    if (newSize > MAX_SIZE) {
      const expired = list.splice(MAX_SIZE);
      expired.forEach(removingId => {
        delete cache[removingId];
      });
    }
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

  subClient.subscribe('events');

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

    const subscription = src.filter(x => x).map(toOutput).observe(block => {
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

  return async (req: any, res: any) => {
    debug && console.log('connected', req.url);
    try {
      const url = req.url;
      const query = parse(url.split('?')[1]);

      addClient(message$, {}, query, req, res);
    } catch (ex) {
      console.log('ex', ex);
    }
  };
};
