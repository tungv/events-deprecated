const request = require('request');
const kefir = require('kefir');
const parseMessage = require('./parseMessage');

const subscribe = (url, headers = {}) => {
  const raw$ = kefir.stream(emitter => {
    const emitString = data => {
      emitter.emit(String(data));
    };

    const errorString = data => {
      emitter.error(String(data));
    };

    const end = () => {
      emitter.end();
    };

    const stream = request(url, { headers });
    stream.on('data', emitString);
    stream.on('error', errorString);
    stream.on('end', end);

    return () => {
      stream.removeListener('data', emitString);
      stream.removeListener('error', errorString);
      stream.removeListener('end', end);
      stream.end();
    };
  });

  const events$ = raw$
    .bufferWhile(string => string.slice(-2) !== '\n\n')
    .map(array => array.join(''))
    .flatten(string => {
      const msg = parseMessage(string);
      return msg.data || [];
    });

  return {
    raw$,
    events$,
    abort: () => stream.abort(),
  };
};

module.exports = subscribe;
