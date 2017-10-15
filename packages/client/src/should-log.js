const LOG_LEVEL = {
  SILLY: 1,
  DEBUG: 2,
  WARN: 3,
  INFO: 4,
  ERROR: 5,
  FATAL: 6,
  DATA: 10,
};

module.exports = minLevel => {
  const minLogLevel = LOG_LEVEL[minLevel];

  return level => LOG_LEVEL[level] >= minLogLevel;
};
