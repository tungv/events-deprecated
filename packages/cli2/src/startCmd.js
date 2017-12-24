import { startApp } from './manager';
import loadConfig from './loadConfig';
import makeLogger, { LOG_LEVEL } from './logger';

export default async function startCmd(opts) {
  const log = makeLogger(opts.verbose);

  log(LOG_LEVEL.INFO, { type: 'init-logger', level: opts.verbose });

  log(LOG_LEVEL.SILLY, {
    type: 'command-begin',
    payload: { cmd: 'start', opts },
  });

  const { name, workers, port, redis } = loadConfig(opts);

  log(LOG_LEVEL.DEBUG, {
    type: 'config-ready',
    payload: { cmd: 'start', name, workers, port, redis },
  });

  const insts = await startApp(
    name,
    { port, name, redis, verbose: opts.verbose },
    workers,
    opts.daemon
  );
}
