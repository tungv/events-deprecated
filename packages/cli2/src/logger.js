const makeLogger = logLevel => {
  return (level, msg) => {
    if (level > logLevel) {
      return;
    }
    msg._t = Date.now();

    console.info(JSON.stringify(msg));
  };
};

export const LOG_LEVEL = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 5,
  SILLY: 10,
};

export default makeLogger;
