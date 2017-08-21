/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';

import pkg from '../../package.json';

export default class Banner extends Component {
  render(props: { command: string }) {
    return (
      <div>
        <Text bold>
          {pkg.name} {props.command} @{pkg.version}
        </Text>
        <br />
      </div>
    );
  }
}
