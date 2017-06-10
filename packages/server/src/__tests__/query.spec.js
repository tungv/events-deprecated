/* @flow */
import del from 'redis-functional/del';
import hgetall from 'redis-functional/hgetall';

import query from '../query';
import redisClient from '../redis-client';
import runLua from '../runLua';

describe('query endpoint', () => {
  it('should query', async () => {
    await del(redisClient, 'test-query::events');

    await runLua(
      redisClient,
      `
        for id=1,10 do
          redis.call('HSET', 'test-query::events', id, '{"type": "test", "payload":'..id..'}')
        end
      `,
      { argv: [], keys: [] }
    );

    const req = {
      query: {
        lastEventId: 5,
      },
      headers: {},
    };

    const service = query({
      redis: { url: process.env.REDIS_URL },
      namespc: 'test-query',
    });

    const actual = await service(req);
    expect(actual).toMatchSnapshot();
  });
});
