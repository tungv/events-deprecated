local function getKeys(from, to, key)
  local newArray = {};
  for id=from,to do
    table.insert(newArray, redis.call('hget', key, id));
  end

  return newArray
end

return getKeys(tonumber(ARGV[1]), tonumber(ARGV[2]), KEYS[1])
-- return getKeys(1, 5000, 'local::events');
