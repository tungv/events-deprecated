import brighten from 'brighten';
let logFn = null;

export default () => logFn;

export const init = (logLevel, reporter = JSON.stringify) => {
  brighten();
  if (!logFn) {
    logFn = (level, msg) => {
      if (level > logLevel) {
        return;
      }
      msg._t = Date.now();
      msg._l = level;

      console.log(reporter(msg));
    };
  }

  return logFn;
};
