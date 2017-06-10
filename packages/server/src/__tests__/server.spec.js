/* @flow */
import serverFactory from '..';
import http from 'http';

jest.unmock('micro');

describe('serverFactory', () => {
  it('should return a server instance', () => {
    const config = {
      redis: { url: process.env.REDIS_URL },
      namespc: 'test',
      history: { size: 10 },
      burst: { time: 10, count: 3 },
    };

    const server = serverFactory(config);
    expect(server).toBeInstanceOf(http.Server);
  });
});
