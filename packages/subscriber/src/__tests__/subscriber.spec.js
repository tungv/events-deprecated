const kefir = require('kefir');

const { stringify } = JSON;
const getChunks = require('../getChunks');

describe('parser', () => {
  it('should work when data are send in batch ending with double newlines', async () => {
    const chunks = [
      ':ok\n\n',
      `id: 1\nevent: name\ndata: [${stringify({ a: 1 })}]\n\n`,
      `id: 2\nevent: name\ndata: [${stringify({ a: 2 })}]\n\n`,
    ];

    const raw$ = kefir.sequentially(0, chunks);

    const events = await raw$
      .thru(getChunks)
      .scan((a, b) => a.concat(b), [])
      .toPromise();

    expect(events).toMatchSnapshot();
  });

  it('should work when multiple data are send in batch ending with double newlines', async () => {
    const chunks = [
      ':ok\n\n',
      `id: 1\nevent: name\ndata: [{"a": 1}]\n\nid: 2\nevent: name\ndata: []\n\n`,
      `id: 3\nevent: name\ndata: [{"a": 2}]\n\n`,
    ];

    const raw$ = kefir.sequentially(0, chunks);

    const events = await raw$
      .thru(getChunks)
      .scan((a, b) => a.concat(b), [])
      .toPromise();

    expect(events).toMatchSnapshot();
  });

  it('should work when data are truncated', async () => {
    const chunks = [
      ':ok\n\n',
      `id: 1\nevent: name\nda`,
      `ta: [${stringify({ a: 1 })}]\n\n`,
      `id: 2\nevent: name\ndata: [${stringify({ a: 2 })}]\n\n`,
    ];

    const raw$ = kefir.sequentially(0, chunks);

    const events = await raw$
      .thru(getChunks)
      .scan((a, b) => a.concat(b), [])
      .toPromise();

    expect(events).toMatchSnapshot();
  });

  it('should work when data are truncated at the first new line', async () => {
    const chunks = [
      ':ok\n\n',
      `id: 1\nevent: name\ndata: [${stringify({ a: 1 })}]\n`,
      `\nid: 2\nevent: name\ndata: [${stringify({ a: 2 })}]\n\n`,
    ];

    const raw$ = kefir.sequentially(0, chunks);

    const events = await raw$
      .thru(getChunks)
      .scan((a, b) => a.concat(b), [])
      .toPromise();

    expect(events).toMatchSnapshot();
  });

  it('should ignore remaining chunks when stream ends', async () => {
    const chunks = [
      ':ok\n\n',
      `id: 1\nevent: name\ndata: [{"a": 1}]\n\nid: 2\nevent: name\ndata: []\n\n`,
      `id: 3\nevent: name\ndata: [{"a": 2}]\n\nabc: 1`,
    ];

    const raw$ = kefir.sequentially(0, chunks);

    const events = await raw$
      .thru(getChunks)
      .scan((a, b) => a.concat(b), [])
      .toPromise();

    expect(events).toMatchSnapshot();
  });
});
