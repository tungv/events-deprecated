import redis from 'redis';

export const createClient = () => redis.createClient();

export default createClient();
