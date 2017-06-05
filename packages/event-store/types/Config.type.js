/* @flow */

type RedisAddress =
  | {}
  | { port: number, host: string, family?: 'IPv6' | 'IPv4' }
  | { path: string }
  | { url: string };

type RedisConfig = {
  enable_offline_queue?: boolean,
  socket_keepalive?: boolean,
  string_numbers?: boolean,
  return_buffers?: boolean,
  enable_offline_queue?: boolean,
  no_ready_check?: boolean,
  retry_unfulfilled_commands?: boolean,
  disable_resubscribing?: boolean,
  prefix?: string,
  password?: string,
  db?: number,
  rename_commands?: { [string]: string },
  retry_strategy?: ({
    attempt: number,
    total_retry_time: number,
    error: Error,
    times_connected: number,
  }) => number,
} & RedisAddress;

export type CommitConfig = {
  redis?: RedisConfig,
  debug?: boolean,
};

export type SubscribeConfig = {
  redis?: RedisConfig,
  history: { size: number },
  debug?: boolean,
};

export type Config = CommitConfig & SubscribeConfig;
