/* @flow */
import { router, get, post } from 'microrouter';
import micro from 'micro';

import type { Config } from '../types/Config.type';
import commit from './commit';
import subscribe from './subscribe';

export default (config: Config) => {
  const committer = commit(config);
  const {service: subscriber, unsubscribe} = subscribe(config);

  const service = router(
    get('/subscribe', subscriber),
    post('/commit', committer)
  );

  const server = micro(service);

  server.on('close', unsubscribe);

  return server;
}
