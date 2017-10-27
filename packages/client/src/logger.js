const chalk = require('chalk');
const format = require('date-fns/format');
const makeShouldLog = require('./should-log');

const METHODS = {
  SILLY: 'log',
  DEBUG: 'log',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'error',
};

const PREFIXES = {
  SILLY: chalk.bgWhite.black.bold.dim(' SLY '),
  DEBUG: chalk.bgWhite.black.bold(' DBG '),
  INFO: chalk.bgGreen.bold(' INF '),
  WARN: chalk.bgYellow.black.bold(' WAR '),
  ERROR: chalk.bgRed.bold(' ERR '),
  FATAL: chalk.bgMagenta.bold(' FTL '),
};

const makeLogger = logLevel => {
  const shouldLog = makeShouldLog(logLevel);

  return (level, body, ts = Date.now()) => {
    if (!shouldLog(level)) return;

    if (level === 'DATA') {
      console.log(body);
      return;
    }

    if (typeof body === 'string') {
      body = [body];
    }

    if (typeof body === 'function') {
      body = [body()];
    }

    const msg = `%s %s: ${body[0]}`;
    const logFn = console[METHODS[level]];

    logFn(msg, PREFIXES[level], chalk.dim(format(ts)), ...body.slice(1));
  };
};

module.exports = makeLogger;
