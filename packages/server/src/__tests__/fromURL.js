import request from 'request';
import kefir from 'kefir';

const fromURL = (url, headers = {}) => {
  const stream = request(url, { headers });

  const data$ = kefir.stream(emitter => {
    const emitString = data => {
      emitter.emit(String(data));
    };

    const errorString = data => {
      emitter.error(String(data));
    };

    const end = () => {
      emitter.end();
    };

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

  const events$ = data$.flatten(string => {
    const msg = parseMessage(string);

    return msg.data || [];
  });

  return {
    data$,
    events$,
    abort: () => stream.abort(),
  };
};

export default fromURL;

const toKeyValue = string => {
  const colonIdx = string.indexOf(':');
  const key = string.slice(0, colonIdx).trim();
  const value = string.slice(colonIdx + 1).trim();

  if (!key) {
    return {};
  }

  return { [key]: value };
};

const parseMessage = string => {
  const lines = string.split('\n').map(toKeyValue);
  const msg = lines.reduce(Object.assign, {});
  if (msg.data) {
    msg.data = JSON.parse(msg.data);
  }

  return msg;
};
