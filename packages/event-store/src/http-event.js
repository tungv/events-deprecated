/* @flow */
import program from 'commander';
import pkg from '../package.json';
import factory from '.';

// [redis:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]

program
  .version(pkg.version)
  .option('-n, --name [name]', 'instance name')
  .option('-r, --redis [redis]', 'redis config: example: redis://192.168.1.1:6379/1')
  .option('-p, --port [port]', 'http server port. Defaults to 3000')
  .parse(process.argv);

if (!program.redis) {
  console.error('option --redis must be specified');
  process.exit();
}

console.log('initializing server');
const server = factory({ namespc: program.name, redis: program.redis, history: { size: 10 } })

console.log('starting event store on port', program.port);
server.listen(program.port);

console.log('server started')
