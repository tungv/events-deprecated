import request from 'request';
import kefir from 'kefir';

const fromURL = (url, headers) => {
  const stream = request(url);

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

  return {
    data$,
    abort: () => stream.abort(),
  };
};

export default fromURL;
