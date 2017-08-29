# npm.im/@events/server

An HTTP API for committing and subscribing events.

1. **built on top redis** - the leading in-memory NoSQL database
2. **guaranted atomicity** with embedded lua script running inside redis
3. **messages are semi-persistent** (will eventually expire or cut-off after going over the limits).
4. **lightweight/simple protocol**: using http text/event-stream to send realtime data from server to server

# usage:

I'd recommend you to use npm.im/@events/cli to manage events server instances. However, if you want to programmatically interact with the server, please follow the below example:

```js
import factory from '@events/server';

const server = factory({
  namespc: 'my-awesome-project',
  redis: { url: 'redis://localhost:6379' },
  history: { size: 10 },
  burst: {
    time: 500,
    count: 20,
  },
  debug: false,
});

server.listen(3000);

console.log('server started');
```
