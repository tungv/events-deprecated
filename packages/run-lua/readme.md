# runLua

```js
const redis = require('redis');
const runLua = require('run-lua');

const redisClient = redis.createClient();
const lua = `
  local counter = redis.call('INCR', KEYS[1]);
  return counter;
`;

const counter = await runLua(redisClient, lua, {
  keys: ['my_counter'],
  argv: [],
});
```
