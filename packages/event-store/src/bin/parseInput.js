import program from 'commander';

program
  .usage('[name] [options]. Eg: http-event MyDemoInstance -p 3000 -r localhost:6379/1')
  .option(
    '-r, --redis [redis]',
    'redis config: example: redis://192.168.1.1:6379/1'
  )
  .option('-p, --port [port]', 'http server port. Defaults to 3000')
  .option('-T, --burst-time [time]', 'buffer time (in milliseconds) before emitting, defaults to 500ms')
  .option('-C, --burst-count [count]', 'buffer count before emitting, defaults to 20 events')
  .option('-v, --verbose', 'prints more log')
  .option('-x, --debug', 'enable debug mode')
  .option('-w, --workers [worker_count]', 'specify the number of processes running in background, defaults to as many as optimal')
  .parse(process.argv);

const name = program.args[0];
if (!name) {
  console.error('please speficy an instance name');
  process.exit();
}

if (!program.redis) {
  console.error('option --redis must be specified');
  process.exit();
}

program.name = name;

export default program;
