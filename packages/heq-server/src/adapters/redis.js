const kefir = require('kefir');
const mitt = require('mitt');
const runLua = require('run-lua');

const redis = require('redis');

const lua_commit = `
  local event = ARGV[1];
  local counter = redis.call('INCR', KEYS[1]);

  redis.call('HSET', KEYS[2], counter, event);
  redis.call('PUBLISH', ARGV[2]..'::events', counter .. ':' .. event);
  return counter;
`;

const lua_query = `
if redis.call('exists', KEYS[1]) == 0 then
  redis.call('set', KEYS[1], 0);
end

local from = tonumber(ARGV[1]) + 1;
local to = tonumber(
  ARGV[2] or redis.call('get', KEYS[1])
);
local newArray = {};

for id=from,to do
  table.insert(newArray, {id, redis.call('hget', KEYS[2], id)});
end

return newArray
`;

const adapter = ({ url, ns = 'local' }) => {
  const redisClient = redis.createClient(url);

  const commit = async event => {
    delete event.id;
    const id = await runLua(redisClient, lua_commit, {
      keys: [`{${ns}}::id`, `{${ns}}::events`],
      argv: [JSON.stringify(event), ns],
    });

    event.id = id;
    return event;
  };

  const emitter = mitt();
  const events = [];
  let id = 0;

  const query = async ({ from, to }) => {
    try {
      const argv = [String(from)];

      if (typeof to !== 'undefined') {
        argv.push(String(to));
      }

      const array = await runLua(redisClient, lua_query, {
        keys: [`{${ns}}::id`, `{${ns}}::events`],
        argv,
      });

      return array.map(([id, event]) => ({
        ...JSON.parse(event),
        id,
      }));
    } catch (ex) {
      console.error(ex);
      return [];
    }
  };

  const subscribe = () => {
    // console.log('subscribe', { id });
    const events$ = kefir.fromEvents(emitter, 'data');
    const latest = id;

    return { latest, events$ };
  };

  return { commit, subscribe, query };
};

module.exports = adapter;
