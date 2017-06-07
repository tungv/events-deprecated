import redis from 'redis';

export const createClient = (config, { debug } = { debug: false }) => {
  const client = redis.createClient({
    ...config,
    retry_strategy: ({ attempt, total_retry_time, error, time_connected }) => {
      if (attempt > 20) {
        return
      }

      return Math.min(attempt * 100, 3000);
    }
  });

  client.on('connect', () => {
    debug && console.log('client connected');
  })

  client.on('reconnecting', ({ delay, attempt }) => {
    debug && console.log('attempting (%d) to reconnect in %dms', attempt, delay);
  })

  process.on('exit', () => {
    debug && console.log('client is quiting forcefully')
    client.end(true);
  })

  return client;
};

const defaultClient = createClient({
  url: process.env.REDIS_URL
});

export default defaultClient;

export type RedisClientType = typeof defaultClient;
