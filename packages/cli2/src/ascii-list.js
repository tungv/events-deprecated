import chalk from 'chalk';
import Table from 'cli-table3';

export default function({ appsCount, instancesCount, apps }) {
  const msg = `
total apps: ${chalk.bold(appsCount)}
total instances: ${chalk.bold(instancesCount)}
`;

  if (!appsCount) {
    return msg;
  }

  const table = new Table({
    head: ['App Name', 'workers', 'port', 'redis'],
  });

  const rows = apps.map(({ workers, port, name, redis }) => [
    name,
    workers,
    port,
    redis,
  ]);

  table.push(...rows);

  return msg + table.toString();
}
