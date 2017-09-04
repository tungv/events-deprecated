const kefir = require('kefir');
const readline = require('readline');

module.exports = function observe(stdin) {
  const rl = readline.createInterface({
    input: stdin,
    output: process.stdout,
    terminal: false,
  });

  const stream = kefir.stream(emitter => {
    let buffer = [];

    rl.on('line', data => {
      buffer.push(data);
      try {
        const json = JSON.parse(buffer.join(''));
        buffer.length = 0;
        emitter.value(json);
      } catch (ex) {
        // continue to buffer
      }
    });

    rl.on('end', () => {
      try {
        const json = JSON.parse(buffer.join(''));
        buffer.length = 0;
        emitter.value(json);
      } finally {
        emitter.end();
      }
    });
  });

  return stream;
};
