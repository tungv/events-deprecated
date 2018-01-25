module.exports = {
  subscribe: {
    serverUrl: 'http://localhost:43322',
  },
  persist: {
    store: 'mongodb://localhost/client_test',
  },
  transform: {
    rulePath: '../rules/user_management.js',
  },
  sideEffects: {
    sideEffectsPath: '../sideEffects/sampleEffects.js',
  },
  hotReload: {
    enabled: true,
  },
  monitor: {
    port: 43333,
  },
};
