const kefir = require('kefir');

const subscribeThread = require('./subscription');

const LOG_LEVEL = {
  SILLY: 1,
  DEBUG: 2,
  WARN: 3,
  INFO: 4,
  ERROR: 5,
  FATAL: 6,
  DATA: 10,
};

const main = config => {
  const minLogLevel = LOG_LEVEL[config.logLevel];

  return kefir.stream(emitter => {
    const emit = (level, type, payload) => {
      if (LOG_LEVEL[level] < minLogLevel) return;
      emitter.emit({
        type,
        payload,
        meta: { level, ts: Date.now() },
      });
    };

    const end = emitter.end.bind(emitter);

    // spawn subscription in next tick
    subscribeThread(config, emit, end);
  });
};

module.exports = main;
