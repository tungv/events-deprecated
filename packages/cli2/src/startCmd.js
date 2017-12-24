import { startApp } from './manager';
import loadConfig from './loadConfig';

export default async function startCmd(opts) {
  const { name, workers, port, redis } = loadConfig(opts);

  const insts = await startApp(
    name,
    { port, name, redis, verbose: opts.verbose },
    workers,
    opts.daemon
  );
}
