import factory from '@events/server';
import nodeRedis from 'redis';
import flushdb from 'redis-functional/flushdb';

export default function({ namespc, redis, port, clean = false }) {
  let p = Promise.resolve(true);

  if (clean) {
    p = p.then(() => {
      const client = nodeRedis.createClient(redis);
      return flushdb(client).then(() => {
        client.quit();
      });
    });
  }

  return p.then(
    () =>
      new Promise(resolve => {
        const server = factory({
          namespc,
          redis: { url: redis },
          history: { size: 10 },
          debug: false,
        });

        server.listen(port, () => {
          resolve(server);
        });
      }),
  );
}
