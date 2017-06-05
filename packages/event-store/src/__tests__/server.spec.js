/* @flow */
import serverFactory from '..';
import http from 'http';

jest.unmock('micro');

describe('serverFactory', () => {
  it('should return a server instance', () => {
    const config = {
      history: { size: 10 },
    };

    const server = serverFactory(config);
    expect(server).toBeInstanceOf(http.Server);
  });
});
