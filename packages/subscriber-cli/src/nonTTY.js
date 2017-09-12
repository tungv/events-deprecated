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
  retry: boolean,
};

const backoff = (current: number, count: number) => {
  return Math.min(2 * 60 * 1000, current * (1 + 0.5 * count));
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default (async function start(
  { url, lastEventId, burstTime, burstCount, debug, retry }: Props,
  retryTime: number = 1000,
  retryCount: number = 0
) {
  const write = debug
    ? (...args) => console.error('[SUBSCRIBER] ', ...args)
    : (str: string): void => {};

  try {
    let latestId = null;

    write(`${name} version ${version}`);
    write(`verifying endpoint ${url}`);
    const latestEvent = await request(`${url}/events/latest`, { json: true });
    write(`latest event from server: ${latestEvent.id}`);
    write(`retry: ${retry ? 'yes' : 'no'}`);

    const connectingTS = Date.now();
    const { raw$, events$, abort } = subscribe(`${url}/subscribe`, {
      'Last-Event-ID': lastEventId,
      'burst-count': burstCount,
      'burst-time': burstTime,
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

    const endOrRetry = async () => {
      write('stream ended');
      if (latestId) {
        write(`latest id: ${latestId}`);
      }

      if (!retry) {
        process.exit(1);
        return;
      }

      write(`retying after 1000 ms...`);

      await delay(1000);

      start(
        {
          url,
          lastEventId: latestId,
          burstTime,
          burstCount,
          debug,
          retry,
        },
        backoff(1000, 1),
        1
      );
    };

    raw$.onEnd(endOrRetry);

    process.on('SIGINT', () => {
      write(`user aborting`);
      raw$.offEnd(endOrRetry);
      abort();
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
  } catch (ex) {
    write(`retrying after ${retryTime} ms`);
    await delay(retryTime);
    start(
      {
        url,
        lastEventId,
        burstTime,
        burstCount,
        debug,
        retry,
      },
      backoff(retryTime, retryCount + 1),
      retryCount + 1
    );
  }
});
