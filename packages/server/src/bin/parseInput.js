import program from 'commander';
import chalk from 'chalk';
import { parse } from 'redis-url';

const redisUrlHelp = `
Format: ${chalk.italic.cyan('[redis://][:password@]host[:port][/db-number][?option=value]')}

Examples:
  redis://localhost:6379
  redis://192.168.1.35:6390
  redis://:MySecretPassword@192.168.1.35:6390/4
  localhost
`;

export default () => {
  program
    .usage(
      `[name] [options].
  Example: ${chalk.italic.cyan('events-server MyDemoInstance -p 3000 -r redis://localhost:6379/1')}`
    )
    .option(
      '-r, --redis [redis]',
      'redis config: example: redis://192.168.1.1:6379/1'
    )
    .option('-p, --port [port]', 'http server port. Defaults to 3000')
    .option(
      '-T, --burst-time [time]',
      'buffer time (in milliseconds) before emitting, defaults to 500ms'
    )
    .option(
      '-C, --burst-count [count]',
      'buffer count before emitting, defaults to 20 events'
    )
    .option('-v, --verbose', 'prints more log')
    .option('-x, --debug', 'enable debug mode')
    .option(
      '-w, --workers [worker_count]',
      'specify the number of processes running in background, defaults to as many as the CPU cores'
    )
    .option(
      '-D, --no-daemon',
      'keep the process running and terminate all instance if the main process is terminated'
    )
    .parse(process.argv);

  const name = program.args[0];

  if (!name) {
    console.error(chalk.bold.red('please speficy an instance name'));
    program.outputHelp(chalk.gray);
    process.exit();
  }

  if (!program.redis) {
    console.error(
      `${chalk.bold.red('option --redis [redis_url] must be specified')}
${redisUrlHelp}`
    );
    process.exit();
  }

  const { protocol, hostname, port, search, path, password, database } = parse(
    program.redis
  );
  if (protocol && protocol !== 'redis:') {
    console.error(chalk.bold.red(`unsupported protocol ${protocol}`));
    console.error(redisUrlHelp);
    process.exit();
  }

  if (program.debug) {
    console.log(`
redis config:
  protocol = ${protocol}
  port = ${port}
  hostname = ${hostname}
  query = ${search.slice(1)}
  path = ${path}${password && `
  password = ${password}`}
  database = ${database}
    `);
  }

  program.name = name;
  program.port = program.port || 3000;
  program.brustTime = program.brustTime || 500;
  program.brustCount = program.brustCount || 20;

  return program;
};
