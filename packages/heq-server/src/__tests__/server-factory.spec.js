const got = require('got');
const enableDestroy = require('server-destroy');
const http = require('http');
const factory = require('../factory');

describe('factory()', () => {
  it('should return start function', async () => {
    const start = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    server.close();

    expect(server).toBeInstanceOf(http.Server);
  });

  it('should able to commit', async () => {
    const start = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    enableDestroy(server);

    const { body } = await got('http://localhost:31234/commit', {
      json: true,
      body: {
        type: 'TEST',
        payload: {
          key: 'value',
        },
      },
    });

    server.destroy();

    expect(body).toEqual({ id: 1, payload: { key: 'value' }, type: 'TEST' });
  });

  it('should able to query', async () => {
    const start = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) {
      await got('http://localhost:31234/commit', {
        json: true,
        body: {
          type: 'TEST',
          payload: {
            key: `value ${i + 1}`,
          },
        },
      });
    }

    const { body } = await got('http://localhost:31234/query', {
      json: true,
      query: {
        lastEventId: 2,
      },
    });

    server.destroy();

    expect(body).toEqual([
      { id: 3, payload: { key: 'value 3' }, type: 'TEST' },
      { id: 4, payload: { key: 'value 4' }, type: 'TEST' },
      { id: 5, payload: { key: 'value 5' }, type: 'TEST' },
    ]);
  });
});
