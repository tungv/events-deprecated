const promisify = require('es6-promisify');

module.exports = promisify((client, cb) => client.flushdb(cb));
