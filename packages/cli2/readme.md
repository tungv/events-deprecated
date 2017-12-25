# heq - hybrid event queue

The core concept is to implement a simple message queue with that

1. uses HTTP as the only protocol
2. does not store any knowledge about its clients
3. allows clients to start subscribing from any recent point in time

# installation

```
npm i -g heq
```

> since heq use redis at the backend, you also need to have a redis connection. To obtain a redis connection, you can either install [redis locally](https://redis.io/topics/quickstart) or use a [hosted service](https://redislabs.com/products/redis-cloud/).

# Usage

## `heq start`

Running `heq start` will start a http server (or a cluster of servers) listening on a port.

```
  Description
  start a new heq server

  Usage
    $ heq start [options]

  Options
    -c, --config            Provide path to custom config  (default heq.config.js)
    --name                  assign a name for this server. This will override `name` in config file
    --port                  http servers will listen on this port. This will override `port` in config file
    --redis                 specify the backend redis or redis cluster connection string. This will override `redis` in config file
    --workers               specify the number of http processes to start. This will override `workers` in config file
    -f, --overwrite    if set, command line options will persist to the config file  (default false)
    -D, --daemon            Run heq server in background  (default false)
    --json                  output logs in JSON format  (default false)
    --verbose               level of log, from 0 (no log) to 10 (log everything)  (default 2)
    -h, --help              Displays this message

  Examples
    $ heq start -c custom.js
    $ heq start -c custom.js --daemon
```
