/* @flow */
import { filter, flow, groupBy, map, toArray } from 'lodash/fp';
import pm2 from 'pm2';

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
    setTimeout(resolve, 500);
    // pm2.delete(fullName, err => {
    //   if (err) {
    //     reject(err);
    //   } else {
    //     resolve();
    //   }
    // });
  });
};
