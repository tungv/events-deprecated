const got = require('got');
const enableDestroy = require('server-destroy');
const http = require('http');
const factory = require('../factory');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

  it('should able to subscribe', async () => {
    const start = await factory({
      http: { port: 31234 },
    });

    const server = await start();
    enableDestroy(server);

    const buffer = [];
    let actual;
    let expected = [];

    for (let i = 0; i < 5; ++i) {
      const body = {
        type: 'TEST',
        payload: {
          key: `value ${i + 1}`,
        },
      };

      await got('http://localhost:31234/commit', { json: true, body });

      if (i > 2) {
        expected.push(body);
      }
    }

    const stream = got.stream('http://localhost:31234/subscribe', {
      headers: {
        'Last-Event-ID': 2,
        'Burst-Time': 1,
      },
    });

    stream.on('data', data => {
      buffer.push(String(data));
    });

    stream.on('end', () => {
      actual = buffer.join('');
    });

    await sleep(20);

    server.destroy();

    await sleep(1);

    expect(actual).toEqual(`:ok

id: 3
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value 3\"},\"id\":3}]

id: 4
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value 4\"},\"id\":4}]

id: 5
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value 5\"},\"id\":5}]

`);
  });
});
