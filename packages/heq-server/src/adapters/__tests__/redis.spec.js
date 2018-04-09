const adapter = require('../redis');
const redis = require('redis');

const clean = async config =>
  new Promise(resolve => {
    const client = redis.createClient({ url: config.url });

    client.del([`{${config.ns}}::id`, `{${config.ns}}::events`], resolve);
  });

describe('redis adapter', () => {
  it('should commit', async () => {
    const queueConfig = {
      driver: '@heq/redis-server',
      url: 'redis://localhost:6379/2',
      ns: '__test__',
    };

    await clean(queueConfig);

    const queue = adapter(queueConfig);

    const event = {
      type: 'test',
      payload: { a: 1 },
    };

    const e1 = await queue.commit(event);

    expect(e1).toEqual({
      id: 1,
      type: 'test',
      payload: { a: 1 },
    });

    const e2 = await queue.commit(event);

    expect(e2).toEqual({
      id: 2,
      type: 'test',
      payload: { a: 1 },
    });
  });

  it('should query in range', async () => {
    const queueConfig = {
      driver: '@heq/redis-server',
      url: 'redis://localhost:6379/2',
      ns: '__test__',
    };

    await clean(queueConfig);

    const queue = adapter(queueConfig);

    for (let i = 0; i < 10; ++i) {
      await queue.commit({ type: 'test', payload: i + 1 });
    }

    const events = await queue.query({ from: 2, to: 5 });
    expect(events).toEqual([
      { id: 3, type: 'test', payload: 3 },
      { id: 4, type: 'test', payload: 4 },
      { id: 5, type: 'test', payload: 5 },
    ]);
  });

  it('should query up to latest', async () => {
    const queueConfig = {
      driver: '@heq/redis-server',
      url: 'redis://localhost:6379/2',
      ns: '__test__',
    };

    await clean(queueConfig);

    const queue = adapter(queueConfig);

    for (let i = 0; i < 10; ++i) {
      await queue.commit({ type: 'test', payload: i + 1 });
    }

    const events = await queue.query({ from: 2 });
    expect(events).toEqual([
      { id: 3, type: 'test', payload: 3 },
      { id: 4, type: 'test', payload: 4 },
      { id: 5, type: 'test', payload: 5 },
      { id: 6, type: 'test', payload: 6 },
      { id: 7, type: 'test', payload: 7 },
      { id: 8, type: 'test', payload: 8 },
      { id: 9, type: 'test', payload: 9 },
      { id: 10, type: 'test', payload: 10 },
    ]);
  });
});
