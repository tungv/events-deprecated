/* @flow */
import prettyMs from 'pretty-ms';
import subscribe from '@events/subscriber';
import { name, version } from '../package.json';

type Props = {
  url: string,
  lastEventId: number,
  burstCount: number,
  burstTime: number,
};

const write = (...args) => console.error('[SUBSCRIBER] ', ...args);

export default (async function({
  url,
  lastEventId,
  burstTime,
  burstCount,
}: Props) {
  write(`${name} version ${version}`);
  write(`connecting to ${url}`);

  let latestId = null;

  const connectingTS = Date.now();
  const { raw$, events$, abort } = subscribe(url, {
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
    if (!latestId) {
      write(
        `first event arrived after ${prettyMs(Date.now() - connectingTS)}!`
      );
    }
    latestId = json.id;
    console.log(`${JSON.stringify(json)}`);
  });
});
