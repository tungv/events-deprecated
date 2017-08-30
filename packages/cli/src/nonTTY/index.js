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

  if (command !== 'start' || args.noDaemon !== true) {
    console.error('command %s --noDaemon is not supported in non-TTY', command);
    process.exit(1);
    return;
  }

  console.log(`%s %s version %s`, name, command, version);
  const disconnect = await connect();
  const app = await startApp(
    argsWithDefault.name,
    argsWithDefault,
    Number(argsWithDefault.workers),
    true
  );

  console.log(
    '%s started %d instance(s)',
    argsWithDefault.name,
    app.instances.length
  );

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
};
