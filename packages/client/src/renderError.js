const chalk = require('chalk');
const InvalidConfigError = require('./InvalidConfigError');
const InvalidEndpoint = require('./InvalidEndpoint');

const format = require('date-fns/format');

module.exports = (error, logger) => {
  if (error instanceof InvalidConfigError) {
    logger(
      'FATAL',
      `${chalk.bold('Configuration Error')}
  please double check your config file.
  path:      ${error.data.path}
  expected:  ${chalk.green(error.data.expected)}
  received:  ${chalk.red(error.data.actual)}
`
    );
    return;
  }

  if (error instanceof InvalidEndpoint) {
    logger('FATAL', [
      'cannot connect to server at %s - %s',
      chalk.bold(error.data.endpoint),
      chalk.dim(error.data.reason),
    ]);
    return;
  }

  logger('ERROR', error.message);
};
