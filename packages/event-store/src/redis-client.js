import redis from 'redis';

export const createClient = (config) => redis.createClient(config);

const defaultClient = createClient({
  url: process.env.REDIS_URL
});

export default defaultClient;

export type RedisClientType = typeof defaultClient;
