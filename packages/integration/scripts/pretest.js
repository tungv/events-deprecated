const redis = require('redis');
const pify = require('pify');
const execa = require('execa');
const { MongoClient } = require('mongodb');
const ping = require('redis-functional/ping');

checkEnv().then(
  ok => {
    process.exit(ok ? 0 : 1);
  },
  err => {
    console.error(err);
    proces.exit(1);
  }
);

async function checkEnv() {
  const {
    REDIS_URL = 'redis://localhost:6379/1',
    MONGODB_URL = 'mongodb://localhost:27017',
    ES_SERVER_PORT = '43322',
  } = process.env;

  console.log('REDIS_URL', REDIS_URL);
  console.log('MONGODB_URL', MONGODB_URL);
  console.log('------------');

  const redisClient = redis.createClient(REDIS_URL);
  const redisOK = await checkRedis(redisClient);

  console.log('------------');

  const mongoClient = await MongoClient.connect(MONGODB_URL);
  const mongoOK = await checkMongo(mongoClient);
  const esServerOK = await startEventserverDaemon(
    'integration-test',
    ES_SERVER_PORT
  );

  console.log('------------');
  console.log('REDIS       OK?', redisOK);
  console.log('MONGO       OK?', mongoOK);
  console.log('ES server   OK?', esServerOK);

  console.log('------------');

  return redisOK && mongoOK && esServerOK;
}

async function checkRedis(client) {
  try {
    console.log('REDIS >> ping');
    const pong = await ping(client);
    console.log('REDIS <<', pong);
    return pong === 'PONG';
  } catch (ex) {
    console.error(ex);
    return false;
  }
}

async function checkMongo(client) {
  try {
    console.log('MONGO >> ping');
    const pong = await client.admin().ping();
    console.log('MONGO <<', pong);
    return pong.ok === 1;
  } catch (ex) {
    console.error(ex);
    return false;
  }
}

async function startEventserverDaemon(name, port) {
  try {
    const esBinPath = './node_modules/.bin/es';
    try {
      await execa('chmod', ['+x', esBinPath]);
    } catch (ex) {
      console.log('ex', ex);
    }

    console.log('restarting es server');
    console.log('stopping es server');
    try {
      const r = await execa(esBinPath, ['stop', name, '--yes']);
      console.log(r.stdout);
    } catch (ex) {
      console.log(ex.message);
      console.log('cannot stop. Probably it was not running');
    }

    console.log('starting es server');
    const result = await execa(esBinPath, [
      'start',
      '--name',
      name,
      '--port',
      port,
      '--redis',
      'redis://localhost:6379/1',
      '--yes',
    ]);
    console.log(result.stdout);
    return true;
  } catch (ex) {
    console.error(ex);
    return false;
  }
}
