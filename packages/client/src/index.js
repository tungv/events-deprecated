const kefir = require('kefir');
const subscribeThread = require('./subscription');

const main = config => {
  return kefir.stream(emitter => {
    const emit = (level, type, payload) => {
      emitter.emit({
        type,
        payload,
        meta: { level, ts: Date.now() },
      });
    };

    const end = emitter.end.bind(emitter);

    // spawn subscription in next tick
    process.nextTick(() => {
      subscribeThread(config, emit, end);
    });
  });
};

module.exports = main;
