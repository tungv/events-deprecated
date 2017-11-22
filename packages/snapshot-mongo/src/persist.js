import PLazy from 'p-lazy';
import kefir from 'kefir';

import createStore from './createStore';

const lazify = factoryPromise => (...args) =>
  new PLazy((resolve, reject) => {
    factoryPromise.then(factory => factory(...args).then(resolve, reject));
  });

export default (args, input$, aggreateNameAndPVs) => {
  const url = args._[0];

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
    .flatMapConcat(request => kefir.fromPromise(dispatch([request])))
    .observe({
      error: e => {
        console.error('cannot persist a checkpoint');
        console.error(e);
      },
    });

  return input$
    .bufferWithTimeOrCount(2, 100)
    .filter(buf => buf.length)
    .flatMapConcat(request => kefir.fromPromise(dispatch(request)));
};
