import { init } from './logger';
import LOG_LEVEL from './logLevels';
import { stopApp } from './manager';
import loadConfig from './loadConfig';
import prettyLog from './prettyLog';

export default async function stopCmd(optionalAppName, opts) {
  const reporter = opts.json ? JSON.stringify : prettyLog;
  const log = init(opts.verbose, reporter);

  log(LOG_LEVEL.INFO, {
    type: 'init-logger',
    payload: { level: opts.verbose },
  });

  log(LOG_LEVEL.SILLY, {
    type: 'command-begin',
    payload: { cmd: 'stop' },
  });

  const app = optionalAppName || loadConfig(opts).name;

  if (!app) {
    log(LOG_LEVEL.ERROR, {
      type: 'cannot-stop',
      payload: { reason: 'APP_NAME_UNSPECIFIED' },
    });
    return;
  }

  log(LOG_LEVEL.INFO, {
    type: 'app-stopping',
    payload: { app },
  });
  await stopApp(app);
  log(LOG_LEVEL.INFO, {
    type: 'app-stopped',
    payload: { app },
  });
}
