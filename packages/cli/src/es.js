#!/usr/bin/env node
/*
  @flow
  @jsx h
*/
import { h, render } from 'ink';
import mri from 'mri';

import App from './components/App';
import nonTTY from './nonTTY';

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

// $FlowFixMe: see https://nodejs.org/api/tty.html
if (Boolean(process.stdout.isTTY)) {
  render(<App command={command} args={args} />);
} else {
  nonTTY(command, args);
}
