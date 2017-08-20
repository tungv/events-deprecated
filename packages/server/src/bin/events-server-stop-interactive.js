#!/usr/bin/env node
/* @flow */
// @jsx h
import { render, h } from 'ink';
import StopCLI from './components/StopCLI';

const pattern = process.argv[2];

const unmount = render(
  <StopCLI onComplete={() => unmount()} pattern={pattern} />
);
