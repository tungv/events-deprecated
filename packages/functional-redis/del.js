const promisify = require('es6-promisify');

module.exports = promisify((client, key, cb) => client.del(key, cb));
