const got = require('got');
const enableDestroy = require('server-destroy');
const http = require('http');
const factory = require('../factory');

const commitSomething = async ({ port }) => {
  const { body } = await got(`http://localhost:${port}/commit`, {
    json: true,
    body: {
      type: 'TEST',
      payload: {
        key: 'value',
      },
    },
  });

  return body;
};

describe('factory()', () => {
  it('should return start function', async () => {
    const { start } = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    server.close();

    expect(server).toBeInstanceOf(http.Server);
  });

  it('should able to commit', async () => {
    const { start } = await factory({
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
    const { start } = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) await commitSomething({ port: 31234 });

    const { body } = await got('http://localhost:31234/query', {
      json: true,
      query: {
        lastEventId: 2,
      },
    });

    server.destroy();

    expect(body).toEqual([
      { id: 3, payload: { key: 'value' }, type: 'TEST' },
      { id: 4, payload: { key: 'value' }, type: 'TEST' },
      { id: 5, payload: { key: 'value' }, type: 'TEST' },
    ]);
  });

  it('should able to subscribe', async done => {
    const { start } = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) await commitSomething({ port: 31234 });

    const stream = got.stream('http://localhost:31234/subscribe', {
      headers: {
        'Last-Event-ID': 2,
        'Burst-Time': 1,
      },
    });

    const buffer = [];

    stream.on('data', data => {
      const msg = String(data);

      buffer.push(msg);

      // stop after receiving event #5
      if (msg.slice(0, 5) === 'id: 5') {
        server.destroy();
      }
    });

    stream.on('end', () => {
      expect(buffer.join('')).toEqual(`:ok

id: 3
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":3}]

id: 4
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":4}]

id: 5
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":5}]

`);
      done();
    });
  });
});
