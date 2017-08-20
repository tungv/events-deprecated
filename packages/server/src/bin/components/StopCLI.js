/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';

import { connect, list, stopApp } from '../async-pm2';
import AppSelectInput from './AppSelectInput';
import Banner from './Banner';

type State = {
  step: 'LOADING' | 'SELECT_APP' | 'STOPPING' | 'ABORTED',
  apps?: EventsServerApp[],
  selectedAppNames: string[],
  error?: string,
  stoppedApps: string[],
};

type Props = {
  onComplete: Function,
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
      this.props.onComplete();
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

    if (apps.length === 0) {
      this.setState({
        error: 'No apps are running. Aborting.',
        step: 'ABORTED',
      });
      setTimeout(() => {
        this.props.onComplete();
      }, 100);
      return;
    }

    this.setState({ apps, step: 'SELECT_APP' });
  }

  render(props: Props, state: State) {
    const { step, error, selectedAppNames, stoppedApps } = state;
    return (
      <div>
        <Banner command="stop" />
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
      </div>
    );
  }
}

export default StopCLI;
