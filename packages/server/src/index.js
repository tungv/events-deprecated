/* @flow */
import { createError, handleErrors } from 'micro-boom';
import { router, get, post } from 'microrouter';
import makeCors from 'micro-cors';
import micro from 'micro';

import { createClient } from './redis-client';
import { name, version } from '../package.json';

const cors = makeCors();

import type { Config } from '../types/Config.type';
import commit from './commit';
import subscribe from './subscribe';
import query from './query';

export default (config: Config) => {
  console.log('%s version %s is starting...', name, version);
  const statusClient = createClient(config.redis, { debug: true });
  const committer = commit(config);
  const { service: subscriber, unsubscribe } = subscribe(config);
  const querier = query(config);

  const service = handleErrors(
    cors(
      router(
        get('/subscribe', subscriber),
        post('/commit', committer),
        get('/query', querier),
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
