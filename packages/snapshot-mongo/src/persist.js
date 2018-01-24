import PLazy from 'p-lazy';
import { fromPromise } from 'kefir';

import createStore from './createStore';

const lazify = factoryPromise => (...args) =>
  new PLazy((resolve, reject) => {
    factoryPromise.then(factory => factory(...args).then(resolve, reject));
  });

export default (args, input$, aggreateNameAndPVs) => {
  const url = args._[0];
  const buffer = args.buffer || {
    enabled: true,
    count: 100,
    time: 2,
  };

  const dispatch = lazify(createStore(url));

  // checkpoint stream
  const checkpoint$ = input$.throttle(1000).map(({ event }) => {
    const updates = aggreateNameAndPVs.map(({ name, version }) => ({
      __pv: '1.0.0',
      op: {
        update: {
          where: { name, version },
          changes: {},
          upsert: true,
        },
      },
    }));
    return {
      event,
      projections: {
        __snapshots: updates,
      },
    };
  });

  checkpoint$
    .flatMapConcat(request => fromPromise(dispatch([request])))
    .observe({
      error: e => {
        console.error('cannot persist a checkpoint');
        console.error(e);
      },
    });

  const bufferedInput$ = buffer.enabled
    ? input$
        .bufferWithTimeOrCount(buffer.time, buffer.count)
        .filter(buf => buf.length)
    : input$.map(r => [r]);

  return bufferedInput$.flatMapConcat(request =>
    fromPromise(dispatch(request))
  );
};
