/* @flow */
import { filter, flow, groupBy, map, toArray } from 'lodash/fp';
import pm2 from 'pm2';
import path from 'path';

type Args = {
  name: string,
  redis: string,
  port: string,
  burstTime: string,
  burstCount: string,
};

const getEventsServerApps = flow(
  filter(p => p.name.startsWith('events-server-')),
  groupBy(p => p.name),
  toArray,
  map(processes => {
    const name = processes[0].name.slice('events-server-'.length);

    return {
      name,
      instances: processes.map(p => ({
        pid: p.pid,
        uptime: Date.now() - p.pm2_env.created_at,
        ram: p.monit.memory,
        cpu: p.monit.cpu,
      })),
    };
  })
);

export const connect = (): Promise<Function> =>
  new Promise((resolve, reject) => {
    pm2.connect(err => {
      if (err) {
        reject(err);
      } else {
        resolve(() => pm2.disconnect());
      }
    });
  });

export const list = (): Promise<EventsServerApp[]> =>
  new Promise((resolve, reject) => {
    pm2.list((err, apps) => {
      if (err) {
        reject(err);
      } else {
        const eventsServerApps = getEventsServerApps(apps);
        resolve(eventsServerApps);
      }
    });
  });

export const stopApp = (app: string) => {
  const fullName = `events-server-${app}`;
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

export const exists = async (appName: string) => {
  const apps = await list();
  return apps.some(a => a.name === appName);
};

const buildArgs = ({ name, redis, port, burstTime, burstCount }: Args) =>
  `--name ${name} --redis ${redis} --port ${port} --burstTime ${burstTime} --burstCount ${burstCount}`;

export const startApp = async (
  name: string,
  args: Args,
  workers: number,
  daemon: boolean
) => {
  const disconnect = await connect();
  return new Promise((resolve, reject) => {
    pm2.start(
      {
        script: path.resolve(__dirname, '../server.js'),
        name: `events-server-${name}`,
        args: buildArgs(args),
        exec_mode: 'cluster',
        instances: workers || 1,
        max_memory_restart: '100M',
      },
      (err, apps) => {
        if (err) {
          reject(err);
          return;
        }

        if (daemon) {
          disconnect();
          resolve(apps);
          return;
        }

        process.on('SIGINT', async () => {
          await stopApp(name);
          disconnect();
          process.exit(0);
        });
      }
    );
  });
};
