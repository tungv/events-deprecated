import del from 'redis-functional/del';
import micro from 'micro';
import range from 'lodash/fp/range';

import { delay } from 'awaiting';
import listen from 'test-listen';

import { commit } from '../commit';
import fromURL from './fromURL';
import makeSubscribe from '../subscribe';
import redisClient, { createClient } from '../redis-client';

jest.unmock('micro');

const takeEvents = (count, stream) =>
  stream.take(count).scan((prev, next) => prev.concat(next), []).toPromise();

describe('subscribe with last-event-id', () => {
  it('should send past event in cache', async () => {
    const namespc = 'test-event-id';
    const pubClient = createClient();

    await del(redisClient, `${namespc}::events`);

    const { service, unsubscribe } = makeSubscribe({
      redis: { url: process.env.REDIS_URL },
      namespc: namespc,
      history: { size: 10 },
      burst: { time: 10, count: 10 },
    });
    const server = micro(service);
    const url = await listen(server);
    await delay(100);

    // commit 10 events (fitted in cache size)
    await Promise.all(
      range(1, 10).map(i =>
        commit(redisClient, { type: 'test', payload: i }, namespc)
      )
    );

    const headers = {
      'Last-Event-ID': '5',
    };

    const { data$, abort } = fromURL({ url, headers });

    // 1 -> :ok
    // 2 -> 6,7,8,9,10 events
    // 3 -> 11 real time
    // 4 -> abort
    const promise = takeEvents(4, data$);
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
    const pubClient = createClient();

    await del(redisClient, `${namespc}::events`);

    const { service, unsubscribe } = makeSubscribe({
      redis: { url: process.env.REDIS_URL },
      namespc: namespc,
      history: { size: 3 },
      burst: { time: 10, count: 10 },
    });
    const server = micro(service);
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
    };

    const { data$, abort } = fromURL({ url, headers });

    const promise = takeEvents(5, data$);

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

    expect(val).toMatchSnapshot();
  });
});
