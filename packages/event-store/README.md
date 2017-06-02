# Event Store

this is under development

# Usage

```js
const server = createServer({
  // specify the storage
  redis: { host: 'localhost', port: 6379, db: 1, prefix: 'test_' },

  // specify transform function
  // here is where you put application logic how to store event
  // this may be omit and just use the standard transformation
  commit: (body, req) => {
    if (req.headers['X-Client-ID']) {
      throw new Error('X-Client-ID must present in headers')
    }

    return {
      type: body.type,
      payload: body.payload,
      meta: {
        client: req.headers['X-Client-ID'],
      }
    };
  }
});

server.listen(3000)
```
