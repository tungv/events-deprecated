// @jsx h

import { Component } from 'ink';

export default class Quit extends Component {
  componentDidMount() {
    process.exit(this.props.exitCode || 0);
  }

  render() {
    return '';
  }
}
