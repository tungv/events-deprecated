import pm2 from 'pm2';

import path from 'path';

import getLogger from './logger';
import LOG_LEVEL from './logLevels';

export const connect = () =>
  new Promise((resolve, reject) => {
    pm2.connect(err => {
      if (err) {
        reject(err);
      } else {
        resolve(() => pm2.disconnect());
      }
    });
  });

export const startApp = async (name, args, workers, daemon) => {
  const disconnect = await connect();
  const log = getLogger();
  return new Promise((resolve, reject) => {
    pm2.start(
      {
        script: path.resolve(__dirname, './server.js'),
        name: `heq-server-${name}`,
        args: `'${JSON.stringify(args)}'`,
        exec_mode: 'cluster',
        instances: workers || 1,
        max_memory_restart: '100M',
        interpreterArgs: ['-r', 'babel-register'],
      },
      (err, apps) => {
        if (err) {
          reject(err);
          return;
        }

        pm2.launchBus((err, bus) => {
          bus.on('log:out', ({ data, process }) => {
            if (data.slice(0, 7) !== '{"type"') {
              log(LOG_LEVEL.INFO, {
                type: 'server-log',
                payload: {
                  process,
                  msg: data.replace(
                    /[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g,
                    ''
                  ),
                },
              });
            } else {
              console.log(data);
            }
          });
        });

        const app = {
          name,
          instances: apps,
        };

        resolve(app);

        if (daemon) {
          disconnect();
          return;
        }

        process.on('SIGINT', async () => {
          log(LOG_LEVEL.INFO, { type: 'begin-shutdown', payload: { name } });
          await stopApp(name);
          log(LOG_LEVEL.INFO, { type: 'complete-shutdown', payload: { name } });
          disconnect();
        });
      }
    );
  });
};

export const stopApp = app => {
  const fullName = `heq-server-${app}`;
  return new Promise((resolve, reject) => {
    // setTimeout(resolve, 500);
    pm2.delete(fullName, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
