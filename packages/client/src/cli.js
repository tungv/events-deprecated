#!/usr/bin/env node
const { bold } = require('chalk');
const mri = require('mri');
const main = require('./index');
const path = require('path');
const pkgDir = require('pkg-dir');
const { inspect } = require('util');
const chalk = require('chalk');

const makeLogger = require('./logger');
const parseConfig = require('./parseConfig');
const renderError = require('./renderError');

const brighten = require('brighten');
const { version: pkgVersion } = require('../package.json');

// clear screen when process is a TTY
if (process.stdout.isTTY) {
  brighten();
}
console.info(bold(`@events/client v${pkgVersion}\n`));

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

const parseConfigAndDisplayError = async (config, configDir, logger) => {
  try {
    return await parseConfig(config, configDir);
  } catch (ex) {
    renderError(ex, logger);
    process.exit(1);
  }
};

(async () => {
  const state = {};

  const rootDir = await pkgDir();
  const configAbsPath = require.resolve(path.resolve(rootDir, configPath));
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
})();

function observeAndLog(finalConfig, logger, state, retryCount = 0) {
  const stream$ = main(finalConfig);

  stream$.onEnd(() => {
    const { retry, retryBackoff } = finalConfig.subscribe;
    const nextRetry = retry + retryCount * retryBackoff;

    state.retry_count = retryCount + 1;
    state.next_retry = Date.now() + nextRetry;

    logger('INFO', `reconnecting in ${nextRetry}ms...`);
    setTimeout(() => {
      observeAndLog(finalConfig, logger, state, retryCount + 1);
    }, nextRetry);
  });

  stream$.observe(p => {
    switch (p.type) {
      case 'CONFIG':
        logger(
          p.meta.level,
          `config content\n${inspect(p.payload.config, {
            depth: null,
            colors: true,
          })}`,
          p.meta.ts
        );
        return;

      case 'SNAPSHOT/CONNECTED': {
        state.snapshot_connected = true;
        state.snapshot_connected_at = p.meta.ts;
        logger(
          p.meta.level,
          [
            `connected to %s. local snapshot version = %s`,
            bold(finalConfig.persist.store),
            bold(p.payload.clientSnapshotVersion),
          ],
          p.meta.ts
        );
        return;
      }

      case 'SERVER/CONNECTED':
        retryCount = 0;
        state.server_connected = true;
        state.server_connected_at = p.meta.ts;
        state.latest_event_received = p.payload.latestEvent;
        state.latest_event_received_at = p.meta.ts;

        logger(
          p.meta.level,
          [
            `connected to %s. current version = %s`,
            bold(finalConfig.subscribe.serverUrl),
            bold(p.payload.latestEvent.id),
          ],
          p.meta.ts
        );
        return;

      case 'SERVER/INCOMING_EVENT':
        state.latest_event_received = p.payload.event;
        state.latest_event_received_at = p.meta.ts;

        logger(
          p.meta.level,
          [
            `event #%s: type=%s`,
            bold(p.payload.event.id),
            bold(p.payload.event.type),
          ],
          p.meta.ts
        );
        return;

      case 'SUBSCRIPTION/CATCH_UP':
        logger(
          p.meta.level,
          'client has caught up with server. Still listening for new events...',
          p.meta.ts
        );
        return;

      case 'TRANSFORM/PROJECTION': {
        const { payload: { projection } } = p;
        const { __v } = projection;

        const changes = Object.keys(projection)
          .filter(k => k !== '__v')
          .map(aggregateName =>
            projection[aggregateName].map(change => {
              const prefix = chalk.bold.italic(
                `${aggregateName}_v${change.__pv}`
              );

              if (change.op.update) {
                return `${prefix}: updating where ${JSON.stringify(
                  change.op.update.where
                )}`;
              }
              if (change.op.insert) {
                return `${prefix}: inserting ${change.op.insert
                  .length} document(s)`;
              }
            })
          )
          .reduce((a, b) => a.concat(b));

        if (changes.length) {
          state.latest_projection_created_at = p.meta.ts;
          logger(
            p.meta.level,
            `${changes.length} update(s) after event #${__v}
  - ${changes.join('\n- ')}`,
            p.meta.ts
          );
        } else {
          logger('DEBUG', chalk.dim('nothing happens'), p.meta.ts);
        }

        return;
      }

      case 'PERSIST/WRITE':
        if (p.payload.documents > 0) {
          state.latest_persistence_created_at = p.meta.ts;
          logger(
            p.meta.level,
            `persistence completed. ${chalk.bold(
              p.payload.documents
            )} document(s) affected. Latest snapshot version is ${p.payload
              .__v}`,
            p.meta.ts
          );
        }
        return;

      case 'SERVER/DISCONNECTED':
        state.server_connected = false;
        state.server_disconnected_at = Date.now();
        logger(
          p.meta.level,
          `cannot connect to server at ${finalConfig.subscribe.serverUrl}`,
          p.meta.ts
        );
        return;
    }

    logger('SILLY', inspect(p, { depth: null, colors: true }));
  });
}
