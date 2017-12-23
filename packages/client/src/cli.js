#!/usr/bin/env node
const mri = require('mri');
const subscribe = require('./index');
const path = require('path');
const pkgDir = require('pkg-dir');
const { inspect } = require('util');
const chalk = require('chalk');

const { bold } = chalk;

const makeLogger = require('./logger');
const parseConfig = require('./parseConfig');
const renderError = require('./renderError');

const messageHandlers = require('./cli-output');

const brighten = require('brighten');
const { version: pkgVersion } = require('../package.json');

// clear screen when process is a TTY
if (process.stdout.isTTY) {
  brighten();
}
console.info(bold(`@events/client v${pkgVersion}\n`));

process.on('unhandledRejection', reason => {
  console.log('unhandledRejection: Reason: ' + reason.stack);
});

const input = mri(process.argv.slice(2), {
  alias: {
    c: 'config',
    x: 'logLevel',
  },
  default: {
    config: './events.config.js',
    logLevel: 'INFO',
  },
});
const configPath = input.config;

main();

function observeAndLog(finalConfig, logger, state) {
  const stream$ = subscribe(finalConfig);

  stream$.onEnd(() => {
    const { retry, retryBackoff } = finalConfig.subscribe;
    const nextRetry = retry + state.retry_count * retryBackoff;

    state.retry_count++;
    state.next_retry = Date.now() + nextRetry;

    logger('INFO', `reconnecting in ${nextRetry}ms...`);
    setTimeout(() => {
      observeAndLog(finalConfig, logger, state);
    }, nextRetry);
  });

  const handler = switcher(messageHandlers, msg => msg.type, logger, state);

  stream$.observe(handler);
}

async function main() {
  const state = {
    retry_count: 0,
  };

  const rootDir = await pkgDir();
  const configAbsPath = path.resolve(rootDir, configPath);
  const configDir = path.resolve(configAbsPath, '..');
  const logger = makeLogger(input.logLevel);

  process.on('exit', code => {
    logger('INFO', `Exiting with code ${chalk.bold(code)}. Bye!`);
  });

  process.on('SIGINT', () => {
    console.log('\n');
    logger('INFO', 'Interrupted!');
    process.exit(0);
  });

  logger('INFO', `log level: ${input.logLevel}`);
  logger('INFO', `loading config from: ${bold(configAbsPath)}`);
  const config = require(configAbsPath);
  logger(
    'SILLY',
    `config content\n${inspect(config, { depth: null, colors: true })}`
  );

  const finalConfig = await parseConfigAndDisplayError(
    config,
    configDir,
    logger
  );

  state.config = finalConfig;

  if (!isNaN(finalConfig.monitor.port)) {
    const micro = require('micro');
    const { router, get } = require('microrouter');

    const server = micro(router(get('/status', () => state)));
    server.listen(finalConfig.monitor.port, () => {
      logger(
        'INFO',
        chalk.bold.green(
          `monitor server is listening on port ${finalConfig.monitor.port}`
        )
      );
    });
  }

  observeAndLog(finalConfig, logger, state);
}

function switcher(map, getter, ...args) {
  return msg => {
    const fn = map[getter(msg)] || map._;
    if (typeof fn === 'function') {
      return fn(msg, ...args);
    }
  };
}
async function parseConfigAndDisplayError(config, configDir, logger) {
  try {
    return await parseConfig(config, configDir);
  } catch (ex) {
    renderError(ex, logger);
    process.exit(1);
  }
}
