const promisify = require('es6-promisify');
const curry = require('curry');

module.exports = promisify((key, client, cb) => client.hgetall(key, cb));
