# Event Store

this is under development

# Usage

```bash
npm i -g @events/server

# command usage

  Usage: events-server [options] [command]


  Commands:

    start [name]  start a new events-server instance
    stop [name]   stop a running events-server instance
    list          list all running instances
    help [cmd]    display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

# run
$ events-server start MyEventStoreDemo -r localhost -p 3000
$ events-server stop MyEventStoreDemo
```
