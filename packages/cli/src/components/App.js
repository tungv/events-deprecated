/*
  @flow
  @jsx h
*/

import { Component, h } from 'ink';

import Banner from './Banner';
import Start from './Start';
import StartNonInteractive from './StartNonInteractive';
import Stop from './Stop';
import List from './List';
import Usage from './Usage';

type CommandEnum = 'stop' | 'start' | 'help' | 'list' | 'ls';

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
        {command === 'stop' && <Stop args={args} />}
        {command === 'start' && !args.yes && <Start args={args} />}
        {command === 'start' && args.yes && <StartNonInteractive args={args} />}
        {(command === 'list' || command === 'ls') && <List />}
      </div>
    );
  }
}

export default App;
