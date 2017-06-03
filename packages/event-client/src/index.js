const request = require('request');
const mitt = require('mitt');
const kefir = require('kefir');

module.exports = class EventSource {
  constructor(url) {
    const stream = request(url);

    const data$ = kefir.stream(emitter => {
      stream.on('data', data => emitter.emit(data));
      stream.on('error', error => emitter.error(error));
      stream.on('end', () => emitter.end());

      return () => stream.close();
    });

    this._data$ = data$;
  }

  addEventListener(event, handler) {
    
  }
};
