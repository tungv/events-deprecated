/*
  @flow
  @jsx h
*/

import { Component, h } from 'ink';

import Banner from './Banner';
import Stop from './Stop';
import Start from './Start';
import Usage from './Usage';

type CommandEnum = 'stop' | 'start' | 'help';

type Props = {
  command: CommandEnum,
  args: any,
};

type State = {
  command: CommandEnum,
};

class App extends Component {
  constructor(props: Props) {
    super(props);

    this.state = {
      command: props.command || 'help',
    };
  }

  changeCommand = ({ cmd }: { cmd: CommandEnum }) => {
    this.setState({ command: cmd });
  };

  render({ args }: Props, { command }: State) {
    return (
      <div>
        <Banner command={command} />
        {command === 'help' && <Usage onCommandSelected={this.changeCommand} />}
        {command === 'stop' && <Stop />}
        {command === 'start' && <Start args={args} />}
      </div>
    );
  }
}

export default App;
