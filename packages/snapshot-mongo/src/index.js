#!/usr/bin/env node
/* @flow */
/* eslint-disable no-console */
import { MongoClient } from 'mongodb';
import mri from 'mri';
import path from 'path';

import querySnapshot from './querySnapshot';

const args = mri(process.argv.slice(2), { alias: { x: 'debug' } });

const cmd = args._.shift();

if (cmd === 'latest') {
  querySnapshot(args);
}
