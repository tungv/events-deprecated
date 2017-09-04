import {
  curry,
  filter,
  flatten,
  flow,
  map,
  mapValues,
  omit,
  set,
} from 'lodash/fp';

export const applyTransforms = collectionTransforms => event =>
  flow(
    filter(transform => transform.when(event)),
    map(transform => transform.dispatch(event)),
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
  flow(
    mergeTransforms(collectionTransforms),
    mapValues(map(appendVersion(event.id)))
  )(event);
