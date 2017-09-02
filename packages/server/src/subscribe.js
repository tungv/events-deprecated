/* @flow */
import { over } from 'lodash/fp';
import kefir from 'kefir';
import once from 'lodash/fp/once';

import type { SubscribeConfig } from '../types/Config.type';
import { getBurstCount, getBurstTime, getLastEventId, getRetry } from './utils';
import connectQueue from './connectQueue';
import { addClient } from './sse';

export default (config: SubscribeConfig) => {
  const { realtimeMessage$, getInitialMessage$, unsubscribe } = connectQueue(
    config
  );

  const service = async (req: any, res: any) => {
    try {
      config.debug && console.log('connected', req.url);
      const [lastEventId, count, time, retry] = over([
        getLastEventId,
        getBurstCount,
        getBurstTime,
        getRetry,
      ])(req);

      const clientOpts = {
        count,
        time,
        retry,
        debug: config.debug,
      };

      config.debug && console.log('lastEventId %j', clientOpts);
      const initialValues = getInitialMessage$(lastEventId);

      addClient(
        kefir.concat([initialValues, realtimeMessage$]),
        clientOpts,
        {}, // query
        req,
        res
      );
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  };

  return {
    service,
    unsubscribe,
  };
};
