import kefir from 'kefir';
import readline from 'readline';

export default function observe(stdin) {
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

    // stdin.on('error', ex => {
    //   try {
    //     const json = JSON.parse(buffer.join(''));
    //     buffer.length = 0;
    //     emitter.value(json);
    //   } finally {
    //     emitter.error(ex);
    //   }
    // });
  });

  return stream;
}
