# Event Store

this is under development

# Usage

```bash
npm i -g http-event

# command usage

  Usage: http-event [options] [command]


  Commands:

    start [name]  start a new http-event instance
    stop [name]   stop a running http-event instance
    list          list all running instances
    help [cmd]    display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

# run
$ http-event start MyEventStoreDemo -r localhost -p 3000
$ http-event stop MyEventStoreDemo
```
