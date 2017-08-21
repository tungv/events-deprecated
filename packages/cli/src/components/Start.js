/*
  @flow
  @jsx h
*/

import { Component, Text, h } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';

import PrintJSON from './PrintJSON';
import Quit from './Quit';

type StartArgs = {
  _: string[],
  name?: string,
  redis?: string,
  port?: number,
  burstTime?: number,
  burstCount?: number,
  workers?: number,
};

type Props = {
  args: StartArgs,
};

type State = {
  currentAnswer: string,
  currentQuestions: string,
  name: string,
  redis: string,
  port: string,
};

type QuestionEnum = 'name' | 'redis' | 'port';

const validate = async (question: QuestionEnum, answer: string) => {
  return new Promise(resolve => setTimeout(resolve, 500));
};

const nextQuestions = question => {
  const questions = [
    'name',
    'redis',
    'port',
    'burstTime',
    'burstCount',
    'workers',
  ];
  const currentIndex = questions.indexOf(question);
  return questions[currentIndex + 1];
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
  return {
    name: 'your app name',
    redis: 'full redis connection string: redis://localhost:6379/1',
    port: 'http port for this app to listen',
    burstTime:
      'buffer time (in milliseconds) before emitting, defaults to 500ms',
    burstCount: 'buffer count before emitting, defaults to 20 events',
    workers:
      'specify the number of processes running in background, defaults to 1',
  }[question];
};

export default class Start extends Component {
  constructor(props: Props) {
    super(props);

    this.state = {
      validating: false,
      currentAnswer: props.args.name || '',
      currentQuestions: 'name',
      name: props.args.name,
      redis: props.args.redis,
      port: props.args.port,
      burstTime: props.args.burstTime,
      burstCount: props.args.burstCount,
      workers: props.args.workers,
    };
  }

  handleChange = (val: string) => {
    if (this.state.validating) {
      return;
    }
    this.setState({ currentAnswer: val.split(' ').join('-') });
  };

  handleSubmit = async (val: string) => {
    const { currentQuestions } = this.state;

    this.setState({ validating: true });
    const errors = await validate(currentQuestions, val);
    this.setState({ validating: false, errors });

    const nextQuestion = nextQuestions(currentQuestions);
    this.setState({
      [currentQuestions]: val,
      currentQuestions: nextQuestion,
      currentAnswer: this.state[nextQuestion] || '',
    });
  };

  render({ args }: Props, state: State) {
    if (state.currentQuestions) {
      return (
        <div>
          <div>
            <Text bold>
              {labelOf(state.currentQuestions)}:{' '}
            </Text>
            <TextInput
              placeholder={placeholderOf(state.currentQuestions)}
              value={state.currentAnswer}
              onChange={this.handleChange}
              onSubmit={this.handleSubmit}
            />
          </div>
          {state.validating &&
            <div>
              <Spinner green />{' '}
              <Text green>Validating {state.currentQuestions}</Text>
            </div>}
        </div>
      );
    }

    return (
      <div>
        <PrintJSON>
          {this.state}
        </PrintJSON>
        <Quit />
      </div>
    );
  }
}
