/* @flow */
import prettyMs from 'pretty-ms';
import subscribe from '@events/subscriber';

type Props = {
  url: string,
  lastEventId: number,
  burstCount: number,
  burstTime: number,
};

const write = (...args) => console.error('SUBSCRIBER:', ...args);

export default (async function({
  url,
  lastEventId,
  burstTime,
  burstCount,
}: Props) {
  write(`connecting to ${url}`);
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
    process.exit(1);
  });

  write(`connected after ${prettyMs(Date.now() - connectingTS)}!`);
  events$.onValue(json => console.log(`${JSON.stringify(json)}`));
});
