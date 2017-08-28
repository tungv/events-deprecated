/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';
import { List, ListItem } from 'ink-checkbox-list';
import ConfirmInput from 'ink-confirm-input';

type Props = {
  apps: EventsServerApp[],
  onSelect: (string[]) => void,
  children: string,
};

type State = {
  selection?: string[],
  confirm: string,
};

class AppSelectInput extends Component {
  state = {
    selection: null,
    confirm: '',
  };

  handleConfirmChange = (confirm: string) => {
    this.setState({ confirm });
  };

  handleListChange = (selection: string[]) => {
    if (selection.length) {
      if (selection[0] === 'ALL') {
        this.setState({ selection: this.props.apps.map(a => a.name) });
      } else {
        this.setState({ selection });
      }

      return;
    }

    this.props.onSelect([]);
  };

  handleSubmit = (confirm: boolean) => {
    if (confirm) {
      this.props.onSelect(this.state.selection);
    } else {
      this.props.onSelect([]);
    }
  };

  componentDidMount() {
    if (this.props.defaultValues) {
      this.list.setState({ checked: this.props.defaultValues });
    }
  }

  render({ onSelect, apps, children }: Props, { selection, confirm }: State) {
    return (
      <div>
        <div>Running apps:</div>
        <Text gray>
          please use ↑ and ↓ array keys to move cursor. Hit space to select. Hit
          enter to submit.
        </Text>
        <br />
        <br />
        <List
          ref={list => {
            this.list = list;
          }}
          onSubmit={this.handleListChange}
          checkedCharacter="◉"
          uncheckedCharacter="◯"
        >
          <ListItem key="all" value="ALL">
            <Text bold italic red>
              {children}
            </Text>{' '}
            <Text gray>
              ⨉ {apps.reduce((s, a) => s + a.instances.length, 0)} instance(s)
            </Text>
          </ListItem>
          {apps.map(app =>
            <ListItem key={app.name} value={app.name}>
              <Text italic>{app.name}</Text>{' '}
              <Text gray>⨉ {app.instances.length} instance(s)</Text>
            </ListItem>
          )}
        </List>
        {selection &&
          <div>
            <br />
            Do you want to stop {selection.join(', ')}? (Y/n){' '}
            <ConfirmInput
              checked
              placeholder="Y"
              value={confirm}
              onChange={this.handleConfirmChange}
              onSubmit={this.handleSubmit}
            />
          </div>}
      </div>
    );
  }
}

export default AppSelectInput;
