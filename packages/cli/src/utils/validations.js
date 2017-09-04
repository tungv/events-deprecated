/*
  @flow
  @jsx h
*/

import { h, Text } from 'ink';

import { connect, exists } from './async-pm2';

const validations = {
  async name(name) {
    if (!name) {
      return <Text red>App name cannot be blank</Text>;
    }
    const disconnect = await connect();
    const inUse = await exists(name);
    disconnect();

    if (inUse) {
      return (
        <Text red>
          {name} is already in use
        </Text>
      );
    }
  },
  async redis(url) {
    const errors = (
      <Text red>
        cannot connect to <Text italic>{url}</Text>
      </Text>
    );

    try {
      const client = require('redis').createClient(url);
      client.on('error', err => {
        client.quit();
      });
      return new Promise(resolve => {
        client.ping(err => {
          client.quit();
          if (err) {
            resolve(errors);
          } else {
            resolve('');
          }
        });
      });
    } catch (ex) {
      return errors;
    }
  },

  async port(portString: string) {
    const port = parseInt(portString, 10);
    if (!port || port < 0 || port >= 65536) {
      return (
        <Text red>
          port {portString} is not a valid port
        </Text>
      );
    }

    const _port = await require('detect-port')(port);
    if (_port !== port) {
      return (
        <Text red>
          port {port} is already in use
        </Text>
      );
    }

    return '';
  },

  workers(workersString: string) {
    const workers = parseInt(workersString, 10);
    if (workers < 1 || isNaN(workers)) {
      return (
        <Text red>
          workers must be a natural number. Received {workersString} instead.
        </Text>
      );
    }
  },
};

const validate = async (question: string, answer: string) => {
  const validator =
    question in validations ? validations[question] : answer => false;

  const delay500 = new Promise(resolve => setTimeout(resolve, 300));

  const [errors] = await Promise.all([validator(answer), delay500]);

  return errors;
};

export default validate;
