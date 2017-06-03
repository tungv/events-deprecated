const promisify = require('es6-promisify');
const curry = require('curry');

module.exports = curry.to(2, promisify((key, client, cb) => client.hlen(key, cb)));
