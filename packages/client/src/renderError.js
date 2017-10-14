const chalk = require('chalk');
const InvalidConfigError = require('./InvalidConfigError');
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

  console.log(error);
};
