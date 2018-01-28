import execa from 'execa';
import prettyMs from 'pretty-ms';

import path from 'path';

export default async ({ json, verbose, config }) => {
  const startTime = Date.now();
  // start a subscribe worker
  const configPath = path.resolve(process.cwd(), config);

  const params = JSON.stringify({ json, verbose, configPath });
  const executable = path.resolve(__dirname, './subscribe.js');

  const worker = execa('node', ['-r', 'babel-register', executable], {
    env: { params },
    silent: true,
  });

  process.on('SIGINT', () => {
    console.log('\ninterrupting...');
    worker.kill('SIGINT');
    // maximum 1s for worker to cleanup
    setTimeout(process.exit, 1000, 0);
  });

  worker.stdout.pipe(process.stdout);
  try {
    await worker;
  } catch (ex) {
    if (ex.code !== 0) {
      process.exit(ex.code);
    }
  } finally {
    console.log('✨ done in', prettyMs(Date.now() - startTime));
  }
};
