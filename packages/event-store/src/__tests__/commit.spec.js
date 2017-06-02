/* @flow */
import flushdb from 'redis-functional/flushdb';
import hgetall from 'redis-functional/hgetall';

import commit from '../commit';
import redisClient from '../redis-client';

describe('commit endpoint', () => {
  beforeEach((done) => {
    flushdb(redisClient, done);
  });

  it('should commit', async () => {
    const transformReq = jest.fn(obj => ({
      type: 'transformed_type',
      payload: { key: 'transformed_value' },
      meta: {
        client: 'test_client',
      },
    }));

    const req = {
      body: {
        type: 'test',
        payload: { key: 'value' },
      },
    };

    const service = commit(transformReq);

    const actual = await service(req);
    expect(actual).toEqual({
      id: 1,
      type: 'transformed_type',
      payload: { key: 'transformed_value' },
      meta: {
        client: 'test_client',
      },
    });

    expect(transformReq).toBeCalledWith(req.body, req);
    expect(await hgetall('events', redisClient)).toEqual({
      '1': JSON.stringify({
        type: 'transformed_type',
        payload: { key: 'transformed_value' },
        meta: {
          client: 'test_client',
        },
      })
    })
  });
});
