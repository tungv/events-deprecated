const getNumberFromReq = ({ header, query }) => req => {
  const fromHeaders = Number(req.headers[header]);

  if (!isNaN(fromHeaders)) {
    return fromHeaders;
  }

  // try query
  const fromQuery = Number(req.query[query]);
  if (!isNaN(fromQuery)) {
    return fromQuery;
  }

  return NaN;
};

export const getLastEventId = getNumberFromReq({
  header: 'last-event-id',
  query: 'lastEventId',
});
export const getBurstCount = getNumberFromReq({
  header: 'burst-count',
  query: 'burstCount',
});
export const getBurstTime = getNumberFromReq({
  header: 'burst-time',
  query: 'burstTime',
});
export const getRetry = getNumberFromReq({
  header: 'retry',
  query: 'retry',
});

export const tryParse = raw => {
  try {
    return JSON.parse(raw);
  } catch (ex) {
    return { type: '@@RAW', payload: raw };
  }
};
