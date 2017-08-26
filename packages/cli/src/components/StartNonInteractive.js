import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';

import { startApp } from '../utils/async-pm2';
import ProcessRunning from './ProcessRunning';
import Quit from './Quit';
import validate from '../utils/validations';

const QUESTIONS = [
  'name',
  'redis',
  'port',
  'burstTime',
  'burstCount',
  'workers',
];

export default class StartNonInteractive extends Component {
  constructor(props) {
    super(props);

    this.state = {};
    Object.keys(props.args).forEach(prop => {
      this.state[prop] = {
        value: props.args[prop],
      };
    });
  }
  async componentDidMount() {
    const { args } = this.props;
    let hasError = false;

    const promises = [
      'name',
      'redis',
      'port',
      'burstTime',
      'burstCount',
      'workers',
    ].map(async prop => {
      const errors = await validate(prop, args[prop]);
      if (errors) {
        hasError = true;
        this.setState({
          [prop]: {
            value: args[prop],
            errors,
          },
        });
      } else {
        this.setState({
          [prop]: {
            value: args[prop],
            errors: null,
          },
        });
      }
    });

    await Promise.all(promises);
    this.setState({ hasError });

    if (!hasError) {
      this.setState({ starting: true });
      const app = await startApp(
        this.props.args.name,
        this.props.args,
        Number(this.props.args.workers),
        true
      );
      this.setState({ starting: false, app });
    }
  }
  render(props, state) {
    const validationCompleted = 'hasError' in state;

    if (!validationCompleted) {
      return (
        <div>
          {QUESTIONS.map(prop =>
            <div key={prop}>
              <Text>
                <Text>{prop}</Text>: <Text bold>{state[prop].value}</Text>
              </Text>
              <Text>
                {' '}{'errors' in state[prop]
                  ? state[prop].errors
                  : <Text green>
                      <Spinner /> validating...
                    </Text>}
              </Text>
            </div>
          )}
        </div>
      );
    }

    if (state.hasError) {
      return (
        <div>
          <Text red>
            Invalid request. Please check your params
            <Quit exitCode={1} />
          </Text>
        </div>
      );
    }

    if (!state.app) {
      return (
        <div>
          <span>
            <Spinner /> Starting...
          </span>
        </div>
      );
    }

    return (
      <ProcessRunning
        app={state.app}
        port={state.port.value}
        keepAlive={state.noDaemon.value}
      />
    );
  }
}
