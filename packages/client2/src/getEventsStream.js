import subscriber from '@events/subscriber';
import got from 'got';
import { write } from './logger';

export default async function getEventsStream({
  subscriptionConfig: { serverUrl, burstCount, burstTime },
  from,
}) {
  const latestEvent = await getLatest(serverUrl);
  if (!latestEvent) {
    throw {
      type: 'err-server-disconnected',
      payload: {
        reason: `cannot connect to ${serverUrl}`,
      },
    };
  }

  const { raw$, events$, abort } = subscriber(`${serverUrl}/subscribe`, {
    'Last-Event-ID': from,
    'burst-count': burstCount,
    'burst-time': burstTime,
  });

  const ready = raw$
    .take(1)
    .toPromise()
    .then(() => Date.now());

  return {
    latestEvent,
    events$,
    ready,
  };
}

async function getLatest(url) {
  try {
    write('SILLY', {
      type: 'inspect',
      payload: url,
    });
    return await got(`${url}/events/latest`, { json: true });
  } catch (ex) {
    return null;
  }
}
