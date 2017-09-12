import execa from 'execa';
import padStream from 'pad-stream';
import getStream from 'get-stream';

import mockServer from '../__mock__/event-server';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('non TTY interface', () => {
  it('should subscribe and pipe events to stdout', async () => {
    const server = await mockServer(12, [
      { id: 10, payload: 10, type: 'test' },
      { id: 11, payload: 11, type: 'test' },
      { id: 12, payload: 12, type: 'test' },
      { id: 13, payload: 13, type: 'test' },
      { id: 14, payload: 14, type: 'test' },
      { id: 15, payload: 15, type: 'test' },
    ]);

    const subscriber = execa('node', [
      'build',
      server.url,
      '--last',
      10,
      '-x',
      '--retry',
    ]);

    // startup time ~500-600ms
    // subscribing from 11 -> 15 will take around 40ms
    await delay(700);

    subscriber.kill('SIGINT');
    server.close();

    expect(await getStream(subscriber.stdout)).toMatchSnapshot('stdout');

    const debugOutput = (await getStream(subscriber.stderr)).split('\n');

    expect(debugOutput).toEqual(
      expect.arrayContaining([
        expect.stringMatching('@events/subscriber-cli version'),
        expect.stringMatching('verifying endpoint'),
        expect.stringMatching('latest event from client: 10'),
        expect.stringMatching('latest event from server: 12'),
        expect.stringMatching('retry: yes'),
        expect.stringMatching(/connected after \dms!/),
        expect.stringMatching(/caught up with server after \d{1,2}ms!/),
        expect.stringMatching('user aborting'),
      ])
    );
  });

  it('should retry if connection cannot be made', async () => {
    const subscriber = execa('node', [
      'build',
      'http://somerandomserverthatdoesntexist.wow',
      '--last',
      10,
      '-x',
      '--retry',
    ]);

    // startup time ~500-600ms
    // first retry will be 1000ms
    // second retry will be 1500ms
    await delay(2000);

    subscriber.kill('SIGINT');

    expect(await getStream(subscriber.stdout)).toBe('');

    const debugOutput = (await getStream(subscriber.stderr)).split('\n');

    expect(debugOutput).toEqual(
      expect.arrayContaining([
        expect.stringMatching('Error: getaddrinfo ENOTFOUND'),
        expect.stringMatching('retrying after 1000 ms'),
        expect.stringMatching('retrying after 1500 ms'),
      ])
    );
  });

  it('should retry if connection is broken', async () => {
    const server = await mockServer(12, [
      { id: 10, payload: 10, type: 'test' },
      { id: 11, payload: 11, type: 'test' },
      { id: 12, payload: 12, type: 'test' },
      { id: 13, payload: 13, type: 'test' },
      async () => {
        throw new Error();
      },
      { id: 14, payload: 14, type: 'test' },
      { id: 15, payload: 15, type: 'test' },
    ]);

    const subscriber = execa('node', [
      'build',
      server.url,
      '--last',
      10,
      '-x',
      '--retry',
    ]);

    // startup time ~500-600ms
    // receiving events 11..13: 30ms
    // first retry will be 1000ms
    // receiving second 14..15 events: 20ms
    await delay(1800);

    subscriber.kill('SIGINT');
    server.close();

    expect(await getStream(subscriber.stdout)).toMatchSnapshot(
      'retry case: stdout'
    );

    const debugOutput = (await getStream(subscriber.stderr)).split('\n');

    expect(debugOutput).toEqual(
      expect.arrayContaining([
        expect.stringMatching('latest event from client: 10'),
        expect.stringMatching('latest event from server: 12'),
        expect.stringMatching('latest id: 13'),
        expect.stringMatching('retrying after 1000 ms'),
        expect.stringMatching('latest event from client: 13'),
        expect.stringMatching('latest event from server: 14'),
      ])
    );
  });
});
