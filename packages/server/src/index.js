/* @flow */
import { createError, handleErrors } from 'micro-boom';
import { router, get, post } from 'microrouter';
import makeCors from 'micro-cors';
import micro from 'micro';

import { createClient } from './redis-client';
import { name, version } from '../package.json';
import queryLatest from './queryLatest';

const cors = makeCors();

import type { Config } from '../types/Config.type';
import commit from './commit';
import subscribe from './subscribe';
import query from './query';

export default (config: Config) => {
  console.log('%s version %s is starting...', name, version);
  const statusClient = createClient(config.redis, { debug: true });
  const commitAPI = commit(config);
  const { service: subscribeAPI, unsubscribe } = subscribe(config);
  const queryAPI = query(config);
  const queryLatestAPI = queryLatest(config);

  const service = handleErrors(
    cors(
      router(
        get('/subscribe', subscribeAPI),
        post('/commit', commitAPI),
        get('/query', queryAPI),
        get('/events/latest', queryLatestAPI),
        () => {
          throw createError(404);
        }
      )
    ),
    config.debug
  );

  const server = micro(service);

  server.on('close', unsubscribe);

  return server;
};
