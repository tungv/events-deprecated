let logFn = () => {};

export default () => logFn;

export const init = (logLevel, reporter = JSON.stringify) => {
  logFn = (level, msg) => {
    if (level > logLevel) {
      return;
    }
    msg._t = Date.now();
    msg._l = level;

    console.log(reporter(msg));
  };

  return logFn;
};
