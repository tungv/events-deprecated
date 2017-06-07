/* @flow */
import { createError, handleErrors } from 'micro-boom';
import { router, get, post } from 'microrouter';
import makeCors from 'micro-cors';
import micro from 'micro';

import { createClient } from '../build/redis-client';

const cors = makeCors();

import type { Config } from '../types/Config.type';
import commit from './commit';
import subscribe from './subscribe';

export default (config: Config) => {
  const statusClient = createClient(config.redis, { debug: true });
  const committer = commit(config);
  const {service: subscriber, unsubscribe} = subscribe(config);

  const service = handleErrors(cors(router(
    get('/subscribe', subscriber),
    post('/commit', committer),
    () => {
      throw createError(404)
    }
  )), config.debug);

  const server = micro(service);

  server.on('close', unsubscribe);

  return server;
}
