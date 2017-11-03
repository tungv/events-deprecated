const chalk = require('chalk');

const { inspect } = require('util');

const { bold } = chalk;

const messageHandlers = {
  CONFIG: (message, logger, state) => {
    logger(
      message.meta.level,
      `config content\n${inspect(message.payload.config, {
        depth: null,
        colors: true,
      })}`,
      message.meta.ts
    );
    return;
  },

  'SNAPSHOT/CONNECTED': (message, logger, state) => {
    state.snapshot_connected = true;
    state.snapshot_connected_at = message.meta.ts;
    logger(
      message.meta.level,
      [
        `connected to %s. local snapshot version = %s`,
        bold(state.config.persist.store),
        bold(message.payload.clientSnapshotVersion),
      ],
      message.meta.ts
    );
    return;
  },

  'SERVER/CONNECTED': (message, logger, state) => {
    state.retryCount = 0;
    state.server_connected = true;
    state.server_connected_at = message.meta.ts;
    state.latest_event_received = message.payload.latestEvent;
    state.latest_event_received_at = message.meta.ts;

    logger(
      message.meta.level,
      [
        `connected to %s. current version = %s`,
        bold(state.config.subscribe.serverUrl),
        bold(message.payload.latestEvent.id),
      ],
      message.meta.ts
    );
    return;
  },

  'SERVER/INCOMING_EVENT': (message, logger, state) => {
    state.latest_event_received = message.payload.event;
    state.latest_event_received_at = message.meta.ts;

    logger(
      message.meta.level,
      [
        `event #%s: type=%s`,
        bold(message.payload.event.id),
        bold(message.payload.event.type),
      ],
      message.meta.ts
    );
    return;
  },

  'SUBSCRIPTION/CATCH_UP': (message, logger, state) => {
    logger(
      message.meta.level,
      'client has caught up with server. Still listening for new events...',
      message.meta.ts
    );
    return;
  },

  'TRANSFORM/PROJECTION': (message, logger, state) => {
    const { payload: { projections } } = message;
    const { __v } = projections;

    const changes = Object.keys(projections)
      .filter(k => k !== '__v')
      .map(aggregateName =>
        projections[aggregateName].map(change => {
          const prefix = chalk.bold.italic(`${aggregateName}_v${change.__pv}`);

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
      state.latest_projection_created_at = message.meta.ts;
      logger(
        message.meta.level,
        `${changes.length} update(s) after event #${__v}\n- ${changes.join(
          '\n- '
        )}`,
        message.meta.ts
      );
    } else {
      logger('DEBUG', chalk.dim('nothing happens'), message.meta.ts);
    }

    return;
  },

  'PERSIST/WRITE': (message, logger, state) => {
    if (message.payload.documents > 0) {
      state.latest_persistence_created_at = message.meta.ts;
      logger(
        message.meta.level,
        `persistence completed. ${chalk.bold(
          message.payload.documents
        )} document(s) affected. Latest snapshot version is ${message.payload
          .event.id}`,
        message.meta.ts
      );
    }
    return;
  },

  'SERVER/DISCONNECTED': (message, logger, state) => {
    state.server_connected = false;
    state.server_disconnected_at = Date.now();
    logger(
      message.meta.level,
      `cannot connect to server at ${state.config.subscribe.serverUrl}`,
      message.meta.ts
    );
    return;
  },

  'SIDE_EFFECTS/COMPLETE': (message, logger, state) => {
    const { successfulEffects, duration } = message.payload;
    if (successfulEffects) {
      logger(
        message.meta.level,
        `${successfulEffects} side effect(s) completed after ${(duration / 1000
        ).toFixed(1)}s`,
        message.meta.ts
      );
    }
    return;
  },

  'SIDE_EFFECTS/HOT_RELOAD_ENABLED': (message, logger, state) => {
    logger(
      message.meta.level,
      `hot reload enabled. Watching ${message.payload.watchPaths
        .length} file(s):
  - ${message.payload.watchPaths.slice(0, 10).join('\n - ')}
  `,
      message.meta.ts
    );

    return;
  },

  'SIDE_EFFECTS/FILE_CHANGED': (message, logger, state) => {
    logger(
      message.meta.level,
      `File changes at ${message.payload
        .location}. Hot reloading side effects...`,
      message.meta.ts
    );
    return;
  },

  'SIDE_EFFECTS/RELOADED': (message, logger, state) => {
    logger(message.meta.level, `Side effects reloaded!`, message.meta.ts);
    return;
  },

  'SIDE_EFFECTS/ERROR_THROWN': (message, logger, state) => {
    const { error } = message.payload;
    logger(
      message.meta.level,
      `Error thown inside a side effect. Message: ${chalk.bold(error.message)}`
    );
    logger(
      'DEBUG',
      () => `Error thown inside a side effect. Message: ${error.stack}`,
      message.meta.ts
    );
    return;
  },

  _: (message, logger) => {
    logger('SILLY', inspect(message, { depth: null, colors: true }));
  },
};

module.exports = messageHandlers;
