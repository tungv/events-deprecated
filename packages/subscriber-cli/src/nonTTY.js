/* @flow */
import prettyMs from 'pretty-ms';
import subscribe from '@events/subscriber';
import request from 'request-promise';
import { name, version } from '../package.json';

type Props = {
  url: string,
  lastEventId: number,
  burstCount: number,
  burstTime: number,
  debug: boolean,
};

export default (async function({
  url,
  lastEventId,
  burstTime,
  burstCount,
  debug,
}: Props) {
  let latestId = null;
  const write = debug
    ? (...args) => console.error('[SUBSCRIBER] ', ...args)
    : (str: string): void => {};

  write(`${name} version ${version}`);

  write(`verifying endpoint ${url}`);
  const latestEvent = await request(`${url}/events/latest`, { json: true });
  write(`latest event from server: ${latestEvent.id}`);

  const connectingTS = Date.now();
  const { raw$, events$, abort } = subscribe(`${url}/subscribe`, {
    'Last-Event-ID': lastEventId,
    'burst-count': burstCount,
    'burst-time': burstTime,
  });

  process.on('SIGINT', () => {
    write('aborting...');
    abort();
  });

  const firstMessage = await raw$.take(1).toPromise();
  if (firstMessage.slice(0, 3) !== ':ok') {
    process.exit(1);
    return;
  }

  raw$.onError(error => {
    write(`Error while subscribing to ${url}`);
    write(error);
  });

  raw$.onEnd(() => {
    write('stream ended');
    if (latestId) {
      write(`latest id: ${latestId}`);
    }
    process.exit(1);
  });

  write(`connected after ${prettyMs(Date.now() - connectingTS)}!`);
  events$.onValue(json => {
    if (json.id >= latestEvent.id) {
      write(
        `caught up with server after ${prettyMs(Date.now() - connectingTS)}!`
      );
    }
    latestId = json.id;
    console.log(`${JSON.stringify(json)}`);
  });
});
