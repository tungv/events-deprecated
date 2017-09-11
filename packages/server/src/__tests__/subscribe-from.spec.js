import { get, router } from 'microrouter';
import del from 'redis-functional/del';
import micro from 'micro';
import range from 'lodash/fp/range';

import { delay } from 'awaiting';
import listen from 'test-listen';
import subscribe from '@events/subscriber';

import { commit } from '../commit';
import makeSubscribe from '../subscribe';
import redisClient, { createClient } from '../redis-client';

jest.unmock('micro');

const takeEvents = (count, stream) =>
  stream.take(count).scan((prev, next) => prev.concat(next), []).toPromise();

describe('subscribe with last-event-id', () => {
  it('should send past event in cache', async () => {
    const namespc = 'test-event-id';
    const pubClient = createClient({ url: process.env.REDIS_URL });

    await del(redisClient, `{${namespc}}::events`);
    await del(redisClient, `{${namespc}}::id`);

    const { service, unsubscribe } = makeSubscribe({
      redis: { url: process.env.REDIS_URL },
      namespc: namespc,
      history: { size: 10 },
    });
    const server = micro(router(get('/', service)));
    const url = await listen(server);
    await delay(100);

    // commit 10 events (fitted in cache size)
    await Promise.all(
      range(0, 10).map(i =>
        commit(redisClient, { type: 'test', payload: i + 1 }, namespc)
      )
    );

    const headers = {
      'Last-Event-ID': '5',
      'Burst-Count': '10',
      'Burst-Time': '10',
    };

    const { events$, abort } = subscribe(url, headers);

    const promise = takeEvents(6, events$);
    await delay(100);

    await commit(redisClient, { type: 'test', payload: 11 }, namespc);
    await delay(100);

    abort();
    server.close();
    unsubscribe();
    const val = await promise;
    pubClient.quit();

    expect(val).toMatchSnapshot();
  });

  it('should send past event from redis if cache missed', async () => {
    const namespc = 'test-old-event';
    const pubClient = createClient({ url: process.env.REDIS_URL });

    await del(redisClient, `{${namespc}}::events`);
    await del(redisClient, `{${namespc}}::id`);

    const { service, unsubscribe } = makeSubscribe({
      redis: { url: process.env.REDIS_URL },
      namespc: namespc,
      history: { size: 3 },
    });
    const server = micro(router(get('/', service)));
    const url = await listen(server);
    await delay(100);

    // commit 10 events (fitted in cache size)
    await Promise.all(
      range(0, 10).map(i =>
        commit(redisClient, { type: 'test', payload: i + 1 }, namespc)
      )
    );

    await delay(100);
    const headers = {
      'Last-Event-ID': '3',
      'Burst-Count': '10',
      'Burst-Time': '10',
    };

    const { abort, events$ } = subscribe(url, headers);

    const promise = takeEvents(9, events$);

    // console.log('commit 11');
    await commit(redisClient, { type: 'test', payload: 11 }, namespc);
    await delay(20);

    // console.log('commit 12');
    await commit(redisClient, { type: 'test', payload: 12 }, namespc);

    // delay 10 for last burst
    await delay(20);

    abort();
    server.close();
    unsubscribe();
    const val = await promise;
    pubClient.quit();
    expect(val.length).toEqual(9);
    expect(val).toMatchSnapshot();
  });
});
