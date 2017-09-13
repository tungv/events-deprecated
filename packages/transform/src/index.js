import {
  filter,
  flatten,
  flow,
  map,
  mapValues,
  assign,
  attempt,
  negate,
  isError,
} from 'lodash/fp';

import arrify from 'arrify';

export const applyTransforms = collectionTransforms => event =>
  flow(
    filter(transform => attempt(() => transform.when(event)) === true),
    map(transform =>
      attempt(() =>
        flow(
          transform.dispatch,
          arrify,
          map(operation => ({
            __pv: transform.version,
            op: operation,
          }))
        )(event)
      )
    ),
    filter(negate(isError)),
    flatten
  )(collectionTransforms);

export const mergeTransforms = mapsOfCollectionTransforms => {
  const mapOfFn = mapValues(applyTransforms, mapsOfCollectionTransforms);

  return event => {
    return mapValues(fn => fn(event))(mapOfFn);
  };
};

export default collectionTransforms => event =>
  flow(mergeTransforms(collectionTransforms), assign({ __v: event.id }))(event);
