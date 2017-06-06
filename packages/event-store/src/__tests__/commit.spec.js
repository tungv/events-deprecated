/* @flow */
import flushdb from 'redis-functional/flushdb';
import hgetall from 'redis-functional/hgetall';

import commit from '../commit';
import redisClient from '../redis-client';

describe('commit endpoint', () => {
  it('should commit', async () => {
    await flushdb(redisClient);

    const req = {
      body: {
        type: 'test',
        payload: { key: 'value' },
      },
    };

    const service = commit({ namespc: 'test-commit' });

    const actual = await service(req);
    expect(actual).toEqual({
      id: 1,
      type: 'test',
      payload: { key: 'value' },
    });

    expect(await hgetall('events', redisClient)).toEqual({
      '1': JSON.stringify({
        type: 'test',
        payload: { key: 'value' },
      }),
    });
  });

  it('should throw 422 if no type is sent', async () => {
    const req = {
      body: {
        payload: { key: 'value' },
      },
    };

    const service = commit({ namespc: 'test-commit' });

    return expect(service(req)).rejects.toMatchSnapshot();
  });
});
