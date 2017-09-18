import { connect, startApp, stopApp } from '../utils/async-pm2';
import { version, name } from '../../package.json';

export default async (command, args) => {
  const argsWithDefault = {
    redis: 'redis://localhost:6379/0',
    port: '30890',
    burstTime: '500',
    burstCount: '20',
    workers: '1',
    ...args,
  };

  const disconnect = await connect();
  console.log(`%s %s version %s`, name, command, version);
  if (command === 'start') {
    const app = await startApp(
      argsWithDefault.name,
      argsWithDefault,
      Number(argsWithDefault.workers),
      !argsWithDefault.noDaemon
    );

    console.log(
      '%s started %d instance(s)',
      argsWithDefault.name,
      app.instances.length
    );

    if (!argsWithDefault.noDaemon) {
      disconnect();
      process.exit(0);
    }

    let stopped = false;
    process.on('SIGINT', async () => {
      await stopApp(argsWithDefault.name);
      console.log('%s stopped', argsWithDefault.name);
      stopped = true;
      disconnect();
      process.exit(0);
    });

    process.on('exit', async () => {
      if (stopped) return;
      await stopApp(argsWithDefault.name);
      console.log('%s stopped', argsWithDefault.name);
      disconnect();
    });
  }

  if (command === 'stop') {
    try {
      await stopApp(argsWithDefault._[0]);
      disconnect();
      process.exit(0);
    } catch (ex) {
      console.log(ex.message);
      disconnect();
      process.exit(1);
    }
  }
};
