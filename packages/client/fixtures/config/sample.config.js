module.exports = {
  logLevel: 'DEBUG',
  subscribe: {
    serverUrl: 'http://localhost:43322',
  },
  persist: {
    store: 'mongodb://localhost/client_test',
    seedFilePath: '../seeding/sample_seeds.json',
  },
  transform: {
    rulePath: '../rules/user_management.js',
  },
  monitor: {
    port: 43333,
  },
};
