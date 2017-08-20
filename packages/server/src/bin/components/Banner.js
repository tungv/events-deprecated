/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';

import pkg from '../../../package.json';

export default class Banner extends Component {
  render(props: { command: string }) {
    return (
      <Text bold>
        {pkg.name} {props.command} @{pkg.version}
        {'\n'}
      </Text>
    );
  }
}
