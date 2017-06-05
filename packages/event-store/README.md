# Event Store

this is under development

# Usage

```bash
npm i -g http-event

# command usage
http-event --help
>  Usage: http-event [options]
>
>  Options:
>
>    -h, --help           output usage information
>    -V, --version        output the version number
>    -n, --name [name]    instance name
>    -r, --redis [redis]  redis config: example: redis://192.168.1.1:6379/1
>    -p, --port [port]    http server port. Defaults to 3000

# run
http-event -r localhost -p 3000 -n MyEventStoreDemo
```
