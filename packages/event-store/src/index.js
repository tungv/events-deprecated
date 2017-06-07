/* @flow */
import { createError } from 'micro-boom';
import { router, get, post } from 'microrouter';
import micro from 'micro';
import makeCors from 'micro-cors';

const cors = makeCors();

import type { Config } from '../types/Config.type';
import commit from './commit';
import subscribe from './subscribe';

export default (config: Config) => {
  const committer = commit(config);
  const {service: subscriber, unsubscribe} = subscribe(config);

  const service = cors(router(
    get('/subscribe', subscriber),
    post('/commit', committer),
    () => {
      throw createError(404)
    }
  ));

  const server = micro(service);

  server.on('close', unsubscribe);

  return server;
}
