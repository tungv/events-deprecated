import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';

import { startApp } from '../utils/async-pm2';
import ProcessRunning from './ProcessRunning';
import Quit from './Quit';
import validate from '../utils/validations';

const QUESTIONS = ['name', 'redis', 'port', 'workers'];

const defaultsOf = question => {
  return {
    redis: 'redis://localhost:6379/0',
    port: '30890',
    workers: '1',
  }[question];
};

export default class StartNonInteractive extends Component {
  constructor(props) {
    super(props);

    this.state = {};
    QUESTIONS.forEach(prop => {
      this.state[prop] = {
        value: props.args[prop] || defaultsOf(prop),
      };
    });
  }
  async componentWillMount() {
    let hasError = false;

    const promises = QUESTIONS.map(async prop => {
      const errors = await validate(prop, this.state[prop].value);
      if (errors) {
        hasError = true;
        this.setState({
          [prop]: {
            value: this.state[prop].value,
            errors,
          },
        });
      } else {
        this.setState({
          [prop]: {
            value: this.state[prop].value,
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
    const validationElement = (
      <div>
        {QUESTIONS.map(prop => {
          const error = state[prop].errors;
          return (
            <div key={prop}>
              <Text
                dim={validationCompleted && !error}
                green={validationCompleted && !error}
              >
                {!validationCompleted && '\u00A0\u00A0\u00A0\u00A0'}
                {validationCompleted && !error && '\u00A0✔\u00A0\u00A0'}
                {validationCompleted && error && '\u00A0✘\u00A0\u00A0'}
                <Text>{prop}</Text>: <Text bold>{state[prop].value}</Text>{' '}
                {validationCompleted
                  ? <Text italic>
                      {error &&
                        <span>
                          ({error})
                        </span>}
                    </Text>
                  : <Text green>
                      <Spinner /> validating...
                    </Text>}
              </Text>
            </div>
          );
        })}
      </div>
    );

    if (!validationCompleted) {
      return validationElement;
    }

    if (state.hasError) {
      return (
        <div>
          {validationElement}
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
          {validationElement}
          <span>
            <Spinner /> Starting...
          </span>
        </div>
      );
    }

    return (
      <div>
        {validationElement}
        <ProcessRunning
          app={state.app}
          port={props.args.port}
          keepAlive={props.args.noDaemon}
        />
      </div>
    );
  }
}
