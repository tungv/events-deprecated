/* @flow */
import kefir from 'kefir';
import mitt from 'mitt';
import once from 'lodash/fp/once'

import { parse } from 'querystring';

import { createClient } from './redis-client';

const subClient = createClient();
subClient.db = 0;

// get notifications for hash keys
subClient.config('set', 'notify-keyspace-events', 'Kh');

const emitter = mitt();

const tryParse = raw => {
  try {
    return JSON.parse(raw);
  } catch (ex) {
    return { type: '@@RAW', payload: raw };
  }
};

const MAX_SIZE = 10;
const history = [];
const cache = {};
const addToCache = (message) => {
  const newSize = history.unshift(message.id);
  cache[message.id] = message;

  if (newSize > MAX_SIZE) {
    const expired = history.splice(MAX_SIZE);
    expired.forEach(removingId => {
      delete cache[removingId];
    });
  }
}


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
  .onValue(addToCache)


subClient.subscribe('events');

function flush(response) {
  if (response.flush && response.flush.name !== 'deprecated') {
    response.flush();
  }
}

const toOutput = event => `id: ${event.id}
event: INCMSG
data: ${JSON.stringify(event)}

`;

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
    res.write(block);
  })

  const removeClient = once(() => {
    subscription.unsubscribe();
    res.end();
  })

  req.on('end', removeClient);
  req.on('close', removeClient);
  res.on('finish', removeClient);
};

export default async (req: any, res: any) => {
  try {
    const url = req.url;
    const query = parse(url.split('?')[1]);

    addClient(message$, {}, query, req, res);
  } catch (ex) {
    console.log('ex', ex);
  }
};
