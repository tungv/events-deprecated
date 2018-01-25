const LOG_LEVEL = {
  SILLY: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5,
  FATAL: 6,
  DATA: 10,
};

let CURRENT_LOG_LEVEL;
let USE_JSON = true;

const JSONReporter = (level, data) => {
  return JSON.stringify(
    Object.assign(
      {
        _t: Date.now(),
        _l: level,
      },
      data,
    ),
  );
};

export const setLogLevel = nextLevel => (CURRENT_LOG_LEVEL = nextLevel);

export const shouldLog = level => {
  const minLogLevel = LOG_LEVEL[CURRENT_LOG_LEVEL];

  return LOG_LEVEL[level] >= minLogLevel;
};

export const write = (level, content) => {
  if (!shouldLog(level)) {
    return;
  }

  const reporter = JSONReporter;

  console.log(reporter(level, content));
};
