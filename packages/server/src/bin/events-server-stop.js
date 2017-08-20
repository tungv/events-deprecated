#!/usr/bin/env node
/* @flow */
// @jsx h
import { render, h } from 'ink';
import StopCLI from './components/StopCLI';

const unmount = render(<StopCLI onComplete={() => unmount()} />);
