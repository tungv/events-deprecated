import PLazy from 'p-lazy';
import kefir from 'kefir';

import createStore from './createStore';

const lazify = factoryPromise => (...args) =>
  new PLazy((resolve, reject) => {
    factoryPromise.then(factory => factory(...args).then(resolve, reject));
  });

export default (args, input$) => {
  const url = args._[0];

  const dispatch = lazify(createStore(url));

  return input$
    .bufferWithTimeOrCount(2, 100)
    .filter(buf => buf.length)
    .flatMapConcat(request => kefir.fromPromise(dispatch(request)));
};
