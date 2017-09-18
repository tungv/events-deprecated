const { createClient } = require('redis');
const pify = require('pify');

const createClientPromise = pify(createClient);

checkEnv();


async function checkEnv() {
  const {
    REDIS_URL = 'redis://localhost:6379',
    MONGODB_URL = 'mongodb://localhost:27017'
  } = process.env;

  const redisClient = await createClientPromise(REDIS_URL);
  if (await checkRedis(redisClient)) {
    console.log('redis ok')
  }
}

async function checkRedis(client) {
  const pingPromise = pify(client.ping.bind(client));
  try {
    const pong = await pingPromise();
    return pong === 'PONG';
  } catch (ex) {
    console.error(ex);
    return false;
  }
}
