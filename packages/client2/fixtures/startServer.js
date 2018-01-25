import factory from '@events/server';

export default function({ namespc, redis, port }) {
  return new Promise(resolve => {
    const server = factory({
      namespc,
      redis,
      history: { size: 10 },
      debug: false,
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}
