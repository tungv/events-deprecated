import pm2 from 'pm2';
import path from 'path';

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
  return new Promise((resolve, reject) => {
    pm2.start(
      {
        script: path.resolve(__dirname, './server.js'),
        name: `heq-server-${name}`,
        args: `'${JSON.stringify(args)}'`,
        exec_mode: 'cluster',
        instances: workers || 1,
        max_memory_restart: '100M',
      },
      (err, apps) => {
        if (err) {
          reject(err);
          return;
        }

        const app = {
          name,
          instances: apps,
        };

        resolve(app);

        if (!daemon) {
          disconnect();
          return;
        }
      }
    );
  });
};
