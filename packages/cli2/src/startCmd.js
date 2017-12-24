import { init } from './logger';
import LOG_LEVEL from './logLevels';
import { startApp } from './manager';
import loadConfig from './loadConfig';
import prettyLog from './prettyLog';

export default async function startCmd(opts) {
  const reporter = opts.json ? JSON.stringify : prettyLog;
  const log = init(opts.verbose, reporter);

  log(LOG_LEVEL.INFO, {
    type: 'init-logger',
    payload: { level: opts.verbose },
  });

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
