/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';

import { connect, list, stopApp } from '../utils/async-pm2';
import AppSelectInput from './AppSelectInput';
import Quit from './Quit';

type State = {
  step: 'LOADING' | 'SELECT_APP' | 'STOPPING' | 'ABORTED' | 'COMPLETED',
  apps?: EventsServerApp[],
  selectedAppNames: string[],
  error?: string,
  stoppedApps: string[],
};

type Props = {
  pattern: string,
};

class StopCLI extends Component {
  state = {
    loading: true,
    apps: null,
    step: 'LOADING',
    stoppedApps: [],
  };

  willComplete() {
    setTimeout(() => {
      this.setState({ step: 'COMPLETED' });
    }, 100);
  }

  onAppSelected = async (appNames: string[]) => {
    if (appNames.length === 0) {
      this.setState({ error: `No apps selected. Aborting.` });
      this.willComplete();
      return;
    }
    this.setState({ selectedAppNames: appNames, step: 'STOPPING' });

    const disconnect = await connect();
    try {
      for (let name of appNames) {
        await stopApp(name);
        this.setState(state => ({ stoppedApps: [...state.stoppedApps, name] }));
      }
    } catch (ex) {
      this.setState({ error: `PM2 error: ${ex.message}. Aborting.` });
    } finally {
      disconnect();
      this.willComplete();
    }
  };

  async componentDidMount() {
    const disconnect = await connect();
    const apps = await list();
    disconnect();

    const filterFn = this.props.pattern
      ? app => app.name.toLowerCase().includes(this.props.pattern.toLowerCase())
      : () => true;

    const filteredApps = apps.filter(filterFn);

    if (filteredApps.length === 0) {
      this.setState({
        error: 'No apps are running. Aborting.',
        step: 'ABORTED',
      });
      this.willComplete();
      return;
    }

    this.setState({ apps: filteredApps, step: 'SELECT_APP' });
  }

  render(props: Props, state: State) {
    const { step, error, selectedAppNames, stoppedApps } = state;
    return (
      <div>
        {props.pattern &&
          <div>
            Filter:{' '}
            <Text bold cyan italic>
              {props.pattern}
            </Text>
            <br />
          </div>}
        {step === 'LOADING' &&
          <div>
            <Spinner green /> Loading Apps...
          </div>}
        {step === 'SELECT_APP' &&
          <div>
            <AppSelectInput apps={state.apps} onSelect={this.onAppSelected} />
          </div>}
        {step === 'STOPPING' &&
          <div>
            {selectedAppNames.map(
              name =>
                stoppedApps.indexOf(name) !== -1
                  ? <div>
                      <Text green>
                        ✔ {name} stopped.
                      </Text>
                    </div>
                  : <div>
                      <Spinner green /> <Text green>Stopping {name}...</Text>
                    </div>
            )}
          </div>}
        {error &&
          <div>
            <Text red bold>
              {error}
            </Text>
          </div>}
        {step === 'COMPLETED' && <Quit />}
      </div>
    );
  }
}

export default StopCLI;
