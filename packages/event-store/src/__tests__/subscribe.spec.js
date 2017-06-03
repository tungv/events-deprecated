const request = require('request');
const listen = require('test-listen');
const micro = require('micro');
const a = require('awaiting');
const service = require('../subscribe').default;

const kefir = require('kefir');

import { createClient } from '../redis-client';

jest.unmock('micro');

describe('subscribe endpoint', () => {
  it('should subscribe', async () => {
    const pubClient = createClient();
    const server = micro(service);
    const url = await listen(server);
    const stream = request(url);

    const data$ = kefir.stream(emitter => {
      const emitString = data => {
        emitter.emit(String(data))
      }

      const errorString = data => {
        emitter.error(String(data))
      }

      const end = () => {
        emitter.end()
      };

      stream.on('data', emitString);
      stream.on('error', errorString);
      stream.on('end', end);

      return () => {
        stream.removeListener('data', emitString);
        stream.removeListener('error', errorString);
        stream.removeListener('end', end);
        stream.end()
      };
    });

    // 1 -> :ok
    // 2 -> first event
    // 3 -> second event
    // 4 -> abort
    const promise = data$.take(4).scan((prev, next) => prev.concat(next), []).toPromise();
    await a.delay(100);

    pubClient.publish('events', '1:{"type":"first"}');
    pubClient.publish('events', '2:{"type":"second","payload":123}');
    await a.delay(100);
    stream.abort();
    const val = await promise;

    expect(val).toMatchSnapshot();
  });
});
