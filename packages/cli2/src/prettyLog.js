import chalk from 'chalk';
import format from 'date-fns/format';

const PREFIXES = {
  10: chalk.bgWhite.black.bold.dim(' SLY '),
  5: chalk.bgWhite.black.bold(' DBG '),
  3: chalk.bgGreen.bold(' INF '),
  2: chalk.bgYellow.black.bold(' WAR '),
  1: chalk.bgRed.bold(' ERR '),
  0: chalk.bgMagenta.bold(' FTL '),
};

const INVERSED_LOG_LEVELS = {
  10: 'SILLY',
  5: 'DEBUG',
  3: 'INFO',
  2: 'WARNING',
  1: 'ERROR',
  0: 'FATAL',
};

const formatMsg = (type, { payload }) => {
  switch (type) {
    case 'init-logger':
      return `log level: ${chalk.bold(INVERSED_LOG_LEVELS[payload.level])}`;
    case 'command-begin':
      return `command = ${payload.cmd}`;

    case 'config-ready':
      return `config:
  name:    ${chalk.italic(payload.name)}
  port:    ${chalk.italic(payload.port)}
  redis:   ${chalk.italic(payload.redis)}
  workers: ${chalk.italic(payload.workers)}
`;

    case 'child-process-starting':
      return `trying to start ${payload.request} process(es)`;

    case 'child-process-started':
      return `${payload.instances} process(es) started`;

    case 'server-err':
      return `[${payload.process.pm_id}] error: ${payload.error}`;

    case 'server-err-stack':
      return `[${payload.process.pm_id}] stack:
${payload.stack.join('\n')}`;

    case 'before-app-start':
      return `starting new server on port ${payload.port}`;

    case 'app-started':
      return `new server stared. id = ${payload.process.pm_id}`;

    case 'child-process-param':
      return `[${payload.process.pm_id}]: param: ${payload.args}`;

    case 'server-log':
      return `[${payload.process.pm_id}]: ${payload.msg}`;

    case 'begin-shutdown':
      return `shutting down...`;

    case 'complete-shutdown':
      return `bye!`;

    default:
      return `${type} ${JSON.stringify(payload)}`;
  }
};

export default msg =>
  `${PREFIXES[msg._l]} ${chalk.dim(format(msg._t))} ${formatMsg(
    msg.type,
    msg
  )}`;
