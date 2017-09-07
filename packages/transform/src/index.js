import {
  curry,
  filter,
  flatten,
  flow,
  map,
  mapValues,
  omit,
  set,
  assign,
  attempt,
  negate,
  isError,
  tap,
} from 'lodash/fp';

export const applyTransforms = collectionTransforms => event =>
  flow(
    filter(transform => {
      const result = attempt(() => transform.when(event));
      if (isError(result)) {
        console.error('[TRANSFORM] error while processing event %s', event.id);
      }

      return result === true;
    }),
    map(transform => attempt(() => transform.dispatch(event))),
    filter(negate(isError)),
    flatten
  )(collectionTransforms);

export const mergeTransforms = mapsOfCollectionTransforms => {
  const mapOfFn = mapValues(applyTransforms, mapsOfCollectionTransforms);

  return event => {
    return mapValues(fn => fn(event), mapOfFn);
  };
};

export const appendVersion = curry((version, cmd) => {
  if (cmd.insert) {
    return set(
      'insert',
      map(c => ({ __v: version, ...omit('__v', c) }), cmd.insert),
      cmd
    );
  }

  if (cmd.update) {
    return set('update.changes.$set.__v', version, cmd);
  }
});

export default collectionTransforms => event =>
  flow(mergeTransforms(collectionTransforms), assign({ __v: event.id }))(event);
