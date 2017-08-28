/* @flow */
// @jsx h
import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';
import minimatch from 'minimatch';

import { connect, list, stopApp } from '../utils/async-pm2';
import AppSelectInput from './AppSelectInput';
import Quit from './Quit';

type State = {
  step: 'LOADING' | 'SELECT_APP' | 'STOPPING' | 'ABORTED' | 'COMPLETED',
  apps?: EventsServerApp[],
  selectedAppNames: string[],
  error?: string,
  stoppedApps: string[],
  preSelectedApps: string[],
};

type Props = {
  args: {
    _: string[],
    filter?: string,
  },
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

  async componentWillMount() {
    const disconnect = await connect();
    const apps = await list();
    disconnect();

    const { args: { _, filter: pattern } } = this.props;

    const preSelectedAppName = _[0];
    const stringPattern = pattern ? String(pattern) : '';

    const filteredApps = stringPattern.length
      ? apps.filter(app => minimatch(app.name, stringPattern))
      : apps;

    const preSelectedApps = preSelectedAppName.length
      ? filteredApps
          .map((app, index) => {
            if (minimatch(app.name, preSelectedAppName)) {
              return index + 1;
            }
            return 0;
          })
          .filter(x => x)
      : [];

    if (filteredApps.length === 0) {
      this.setState({
        error: 'No apps are running. Aborting.',
        step: 'ABORTED',
      });
      this.willComplete();
      return;
    }

    this.setState({ apps: filteredApps, step: 'SELECT_APP', preSelectedApps });
  }

  render({ args }: Props, state: State) {
    const {
      step,
      error,
      selectedAppNames,
      stoppedApps,
      preSelectedApps,
    } = state;
    return (
      <div>
        {args.filter &&
          <div>
            Filter:{' '}
            <Text bold cyan italic>
              {args.filter}
            </Text>
            <br />
          </div>}
        {step === 'LOADING' &&
          <div>
            <Spinner green /> Loading{args.filter ? ' matching ' : ' '}Apps...
          </div>}
        {step === 'SELECT_APP' &&
          <div>
            <AppSelectInput
              defaultValues={preSelectedApps}
              apps={state.apps}
              onSelect={this.onAppSelected}
            >
              All{args.filter ? ' matching ' : ' '}apps
            </AppSelectInput>
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
        {step === 'COMPLETED' && <Quit exitCode={error ? 1 : 0} />}
      </div>
    );
  }
}

export default StopCLI;
