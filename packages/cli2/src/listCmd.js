import brighten from 'brighten';

import { init } from './logger';
import { listApps } from './manager';
import LOG_LEVEL from './logLevels';
import prettyLog from './prettyLog';

export default async function list(opts) {
  const reporter = opts.json ? JSON.stringify : prettyLog;
  const log = init(opts.verbose, reporter);

  log(LOG_LEVEL.INFO, {
    type: 'init-logger',
    payload: { level: opts.verbose },
  });

  log(LOG_LEVEL.SILLY, {
    type: 'command-begin',
    payload: { cmd: 'list', opts },
  });

  const apps = await listApps();

  const heqApps = apps.filter(app => app.name.startsWith('heq-server-'));

  const groupedByName = group(a => a.name, heqApps);
  const appsCount = Object.keys(groupedByName).length;

  const appsParams = mapValues(group => {
    return { ...getParams(group[0]), workers: group.length };
  }, groupedByName);

  log(LOG_LEVEL.INFO, {
    type: 'list-received',
    payload: {
      appsCount,
      instancesCount: heqApps.length,
      apps: appsParams,
    },
  });
}

const getParams = app => {
  const { args } = app.pm2_env;

  const json = args[0];
  return JSON.parse(json);
};

const group = (projection, array) => {
  const gps = {};

  array.forEach(item => {
    const key = projection(item);
    if (!gps[key]) {
      gps[key] = [];
    }

    gps[key].push(item);
  });

  return gps;
};

const mapValues = (projection, obj) => {
  return Object.keys(obj).map(k => {
    return projection(obj[k]);
  });
};
