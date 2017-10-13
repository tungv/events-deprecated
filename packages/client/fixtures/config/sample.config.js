module.exports = {
  logLevel: 'DEBUG',
  subscribe: {
    serverUrl: 'http://localhost:43322',
    burstCount: 20,
    burstTime: 500,
  },
  persist: {
    store: 'mongodb://localhost/client_test',
  },
  transform: {
    rulePath: '../rules/user_management.js',
  },
};
