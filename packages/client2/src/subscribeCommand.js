import path from 'path';
import execa from 'execa';

export default async ({ json, verbose, config }) => {
  // start a subscribe worker
  const configPath = path.resolve(process.cwd(), config);

  const params = JSON.stringify({ json, verbose, configPath });
  const executable = path.resolve(__dirname, './subscribe.js');

  const worker = execa('node', ['-r', 'babel-register', executable], {
    env: { params },
  });

  worker.stdout.pipe(process.stdout);
  await worker;
};
