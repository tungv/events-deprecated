import factory from '@events/server';
import nodeRedis from 'redis';
import del from 'redis-functional/del';
import enableDestroy from 'server-destroy';

export default function({ namespc, redis, port, clean = false }) {
  let p = Promise.resolve(true);

  if (clean) {
    p = p.then(async () => {
      const client = nodeRedis.createClient(redis);
      await del(client, `{${namespc}}::id`);
      await del(client, `{${namespc}}::events`);

      client.quit();
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

        enableDestroy(server);

        server.listen(port, () => {
          resolve(server);
        });
      }),
  );
}
