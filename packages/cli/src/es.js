#!/usr/bin/env node
/*
  @flow
  @jsx h
*/
import mri from 'mri';
import { h, render } from 'ink';
import App from './components/App';

const args = mri(process.argv.slice(2), {
  alias: {
    R: 'filter',
    Y: 'yes',
    w: 'workers',
    p: 'port',
    r: 'redis',
    T: 'burstTime',
    C: 'burstCount',
  },
});

const command = args._.shift();

render(<App command={command} args={args} />);
