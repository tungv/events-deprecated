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
  status: {
    [name: string]: 'STOPPING' | 'STOPPED',
  },
  preSelectedAppIndexes: number[],
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
    status: {},
  };

  willComplete() {
    setTimeout(() => {
      this.setState({ step: 'COMPLETED' });
    }, 100);
  }

  async stopApps(selectedAppNames: string[]) {
    const status = selectedAppNames.reduce(
      (obj, name) => Object.assign(obj, { [name]: 'STOPPING' }),
      {}
    );

    this.setState({ selectedAppNames, status });

    const disconnect = await connect();
    try {
      for (let name of selectedAppNames) {
        await stopApp(name);
        this.setState(state => ({
          status: {
            ...state.status,
            [name]: 'STOPPED',
          },
        }));
      }
    } catch (ex) {
      this.setState({ error: `PM2 error: ${ex.message}. Aborting.` });
    } finally {
      disconnect();
      this.willComplete();
      return;
    }
  }

  onAppSelected = async (appNames: string[]) => {
    if (appNames.length === 0) {
      this.setState({ step: 'ABORTED', error: `No apps selected. Aborting.` });
      return;
    }

    await this.stopApps(appNames);
  };

  async componentWillMount() {
    const disconnect = await connect();
    const apps = await list();
    disconnect();

    const { args: { _, filter: pattern, yes: nonInteractive } } = this.props;

    const preSelectedAppName = _[0] || '';
    const stringPattern = pattern ? String(pattern) : '';

    const filteredApps = stringPattern.length
      ? apps.filter(app => minimatch(app.name, stringPattern))
      : apps;

    const preSelectedAppIndexes = preSelectedAppName.length
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

    if (nonInteractive && preSelectedAppIndexes.length) {
      const selectedAppNames = filteredApps
        .map(
          (app, i) => (preSelectedAppIndexes.includes(i + 1) ? app.name : '')
        )
        .filter(x => x);

      await this.stopApps(selectedAppNames);
      return;
    }

    if (nonInteractive && !preSelectedAppIndexes.length) {
      this.setState({ step: 'ABORTED', error: `No apps selected. Aborting.` });
      return;
    }

    this.setState({
      apps: filteredApps,
      step: 'SELECT_APP',
      preSelectedAppIndexes,
    });
  }

  render({ args }: Props, state: State) {
    const {
      step,
      error,
      selectedAppNames,
      status,
      preSelectedAppIndexes,
    } = state;

    const filterElem = args.filter
      ? <div>
          Filter:{' '}
          <Text bold cyan italic>
            {args.filter}
          </Text>
          <br />
        </div>
      : null;

    if (step === 'LOADING') {
      return (
        <div>
          {filterElem}
          <div>
            <Spinner green /> Loading{args.filter ? ' matching ' : ' '}Apps...
          </div>
        </div>
      );
    }

    if (step === 'ABORTED') {
      return (
        <div>
          {filterElem}
          <div>
            <Text red>
              {error}
            </Text>
            <Quit exitCode={1} />
          </div>
        </div>
      );
    }

    if (step === 'SELECT_APP') {
      return (
        <div>
          {filterElem}
          <div>
            <AppSelectInput
              defaultValues={preSelectedAppIndexes}
              apps={state.apps}
              onSelect={this.onAppSelected}
            >
              All{args.filter ? ' matching ' : ' '}apps
            </AppSelectInput>
          </div>
        </div>
      );
    }

    // render apps being stopped
    return (
      <div>
        {filterElem}
        <div>
          {selectedAppNames.map(name =>
            <div>
              {status[name] === 'STOPPING' ? <Spinner green /> : '\u00A0'}{' '}
              <Text bold>{name}</Text>{' '}
              {status[name] === 'STOPPING' ? 'is stopping...' : 'has stopped!'}
            </div>
          )}
        </div>
        {step === 'COMPLETED' && <Quit exitCode={error ? 1 : 0} />}
      </div>
    );
  }
}

export default StopCLI;
