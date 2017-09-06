import { MongoClient } from 'mongodb';
import createStore from './createStore';
import kefir from 'kefir';
import PLazy from 'p-lazy';

const lazify = factory => (...args) =>
  new PLazy((resolve, reject) => {
    factory(...args).then(resolve, reject);
  });

export default async (args, input$) => {
  const url = args._[0];
  const db = await MongoClient.connect(url);

  const dispatch = lazify(await createStore(db));

  return input$.flatMapConcat(request => kefir.fromPromise(dispatch(request)));
};
