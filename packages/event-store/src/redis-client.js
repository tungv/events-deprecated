import redis from 'redis';

export const createClient = () => redis.createClient();

const defaultClient = createClient();

export default defaultClient;

export type RedisClientType = typeof defaultClient;
