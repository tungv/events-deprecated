import redis from 'redis';
import clui from 'clui';

let countdown = new clui.Spinner();
let started;

export const createClient = (config, { debug } = { debug: false }) => {
  const client = redis.createClient({
    ...config,
    retry_strategy: ({ attempt, total_retry_time, error, time_connected }) => {
      if (attempt > 20) {
        return;
      }

      return Math.min(attempt * 100, 3000);
    },
  });

  client.on('connect', () => {
    if (debug) {
      started = false;
      countdown.stop();
    }
  });

  client.on('reconnecting', ({ delay, attempt }) => {
    if (debug) {
      countdown.message(
        `attempting (${attempt}) to reconnect in ${delay}ms...`
      );
      if (!started) {
        started = true;
        countdown.start();
      }
    }
  });

  process.on('exit', () => {
    debug && console.log('client is quiting forcefully');
    client.end(true);
  });

  return client;
};

const defaultClient = createClient({
  url: process.env.REDIS_URL,
});

export default defaultClient;

export type RedisClientType = typeof defaultClient;
