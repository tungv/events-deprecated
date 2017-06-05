/* @flow */
import flushdb from 'redis-functional/flushdb';
import hgetall from 'redis-functional/hgetall';

import query from '../query';
import redisClient from '../redis-client';
import runLua from '../runLua';

describe('query endpoint', () => {
  it('should query', async () => {
    await flushdb(redisClient);

    await runLua(
      redisClient,
      `
        for id=1,10 do
          redis.call('HSET', 'test::events', id, '{"type": "test", "payload":'..id..'}')
        end
      `,
      { argv: [], keys: [] }
    )

    const req = {
      query: {
        lastEventId: 5
      },
      headers: {}
    };

    const service = query({ namespc: 'test' });

    const actual = await service(req);
    expect(actual).toMatchSnapshot();
  });
});
