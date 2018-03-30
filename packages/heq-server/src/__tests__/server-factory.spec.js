const got = require('got');
const enableDestroy = require('server-destroy');
const http = require('http');
const factory = require('../factory');
const ports = require('port-authority');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    const port = await ports.find(30000);
    const { start } = await factory({
      http: { port },
    });

    const server = await start();
    server.close();

    expect(server).toBeInstanceOf(http.Server);
  });

  it('should able to commit', async () => {
    const port = await ports.find(30000);
    const { start } = await factory({
      http: { port },
    });

    const server = await start();
    enableDestroy(server);

    const { body } = await got(`http://localhost:${port}/commit`, {
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
    const port = await ports.find(30000);
    const { start } = await factory({
      http: { port },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) await commitSomething({ port });

    const { body } = await got(`http://localhost:${port}/query`, {
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
    const port = await ports.find(30000);
    const { start } = await factory({
      http: { port },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) await commitSomething({ port });

    const stream = got.stream(`http://localhost:${port}/subscribe`, {
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

id: 5
event: INCMSG
data: [{"type":"TEST","payload":{"key":"value"},"id":3},{"type":"TEST","payload":{"key":"value"},"id":4},{"type":"TEST","payload":{"key":"value"},"id":5}]

`);
      done();
    });
  });

  it('should able to subscribe from a past event id', async done => {
    const port = await ports.find(30000);
    const { start } = await factory({
      http: { port },
    });

    const server = await start();
    enableDestroy(server);

    for (let i = 0; i < 5; ++i) await commitSomething({ port });

    const stream = got.stream(`http://localhost:${port}/subscribe`, {
      headers: {
        'Last-Event-ID': 2,
        'Burst-Time': 1,
      },
    });

    await sleep(0);
    for (let i = 0; i < 5; ++i) await commitSomething({ port });

    const buffer = [];

    stream.on('data', data => {
      const msg = String(data);

      buffer.push(msg);

      // // stop after receiving event #5
      // if (msg.slice(0, 5) === 'id: 10') {
      //   server.destroy();
      // }
    });

    setTimeout(() => server.destroy(), 100);

    stream.on('end', () => {
      expect(buffer.join('')).toEqual(`:ok

id: 5
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":3},{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":4},{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":5}]

id: 6
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":6}]

id: 7
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":7}]

id: 8
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":8}]

id: 9
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":9}]

id: 10
event: INCMSG
data: [{\"type\":\"TEST\",\"payload\":{\"key\":\"value\"},\"id\":10}]

`);
      done();
    });
  });
});
