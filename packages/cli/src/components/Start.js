/*
  @flow
  @jsx h
*/

import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

import { buildArgs, connect, startApp, stopApp } from '../utils/async-pm2';
import PrintJSON from './PrintJSON';
import ProcessRunning from './ProcessRunning';
import Quit from './Quit';
import validate from '../utils/validations';

type StartArgs = {
  _: string[],
  name?: string,
  redis?: string,
  port?: number,
  burstTime?: number,
  burstCount?: number,
  workers?: number,
  noDaemon: boolean,
};

type Props = {
  args: StartArgs,
};

type State = {
  errors: any,
  currentAnswer: string,
  currentQuestion: string,
  name: string,
  redis: string,
  port: string,
  burstTime: string,
  burstCount: string,
  workers: string,
  app: EventsServerApp,
};

type QuestionEnum = 'name' | 'redis' | 'port';

const QUESTIONS = [
  'name',
  'redis',
  'port',
  'burstTime',
  'burstCount',
  'workers',
];

const nextQuestions = question => {
  const currentIndex = QUESTIONS.indexOf(question);
  return QUESTIONS[currentIndex + 1];
};

const defaultsOf = question => {
  return {
    redis: 'redis://localhost:6379/0',
    port: '30890',
    burstTime: '500',
    burstCount: '20',
    workers: '1',
  }[question];
};

const labelOf = question => {
  return {
    name: 'App Name',
    redis: 'Redis URL',
    port: 'HTTP port',
    burstTime: 'Burst Time',
    burstCount: 'Burst Count',
    workers: 'Number of workers',
  }[question];
};

const placeholderOf = question => {
  const def = defaultsOf(question);

  return (
    {
      name: 'your app name',
      redis: 'full redis connection string',
      port: 'http port for this app to listen',
      burstTime:
        'maximum buffer wait time (in milliseconds) before sending message',
      burstCount: 'maximum number of events can be sent in one message',
      workers: 'specify the number of processes running in background',
    }[question] + `${def ? `. Default: ${def}` : ''}`
  );
};

export default class Start extends Component {
  constructor(props: Props) {
    super(props);

    this.state = {
      validating: false,
      currentAnswer: props.args.name || '',
      currentQuestion: 'name',
      name: props.args.name,
      redis: props.args.redis,
      port: String(props.args.port || ''),
      burstTime: String(props.args.burstTime || ''),
      burstCount: String(props.args.burstCount || ''),
      workers: String(props.args.workers || ''),
    };
  }

  handleChange = (val: string) => {
    if (this.state.validating) {
      return;
    }
    this.setState({ currentAnswer: val.split(' ').join('-') });
  };

  handleSubmit = async (val: string) => {
    const { currentQuestion } = this.state;

    const finalValue = val || defaultsOf(currentQuestion);

    this.setState({ validating: true });
    const errors = await validate(currentQuestion, finalValue);
    this.setState({ validating: false, errors, currentAnswer: '' });

    if (errors) {
      return;
    }

    const nextQuestion = nextQuestions(currentQuestion);

    this.setState({
      [currentQuestion]: finalValue,
      currentQuestion: nextQuestion,
      currentAnswer: this.state[nextQuestion] || '',
    });

    if (nextQuestion) {
      return;
    }

    this.setState(
      {
        status: 'STARTING',
        currentQuestion: null,
        daemon: this.props.args.noDaemon,
      },
      async () => {
        const app = await startApp(
          this.state.name,
          this.state,
          Number(this.state.workers),
          !this.props.args.noDaemon
        );
        this.setState({ status: 'STARTED', app });
      }
    );
  };

  render({ args }: Props, state: State) {
    const summary = (
      <div>
        {QUESTIONS.map(
          (q, index) =>
            state[q] &&
            (QUESTIONS.indexOf(state.currentQuestion) > index ||
              !state.currentQuestion) &&
            <div>
              <Text bold dim green>
                ✔ {labelOf(q)}
              </Text>:{' '}
              <Text italic dim green>
                {state[q]}
              </Text>
            </div>
        )}
      </div>
    );

    const error =
      state.errors &&
      <div>
        {state.errors}
      </div>;

    if (state.currentQuestion) {
      return (
        <div>
          {summary}
          {error}
          <div>
            <Text bold>
              {labelOf(state.currentQuestion)}:{' '}
            </Text>
            <TextInput
              placeholder={placeholderOf(state.currentQuestion)}
              value={state.currentAnswer}
              onChange={this.handleChange}
              onSubmit={this.handleSubmit}
            />
          </div>
          {state.validating &&
            <div>
              <Spinner green />{' '}
              <Text green>Validating {state.currentQuestion}</Text>
            </div>}
        </div>
      );
    }

    const guideElem = (
      <div>
        <Text italic>Next time you can use this to start similar app:</Text>
        <br />
        <Text ilatic bold>
          es start {buildArgs(this.state)} --workers {this.state.workers} --yes
        </Text>
      </div>
    );

    if (state.status === 'STARTING') {
      return (
        <div>
          {summary}
          {error}
          <Text>
            <Spinner green /> Starting {state.name} ⨉ {state.workers}{' '}
            instance(s)...
          </Text>
          {guideElem}
        </div>
      );
    }

    return (
      <div>
        {summary}
        {error}
        {guideElem}
        <ProcessRunning
          app={state.app}
          keepAlive={args.noDaemon}
          port={state.port}
        />
      </div>
    );
  }
}
