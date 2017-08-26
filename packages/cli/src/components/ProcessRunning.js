import { h, Component, Text } from 'ink';
import Spinner from 'ink-spinner';
import { connect, stopApp } from '../utils/async-pm2';
import Quit from './Quit';

export default class ProcessRunning extends Component {
  constructor(props) {
    super(props);

    this.state = {
      keepAlive: this.props.keepAlive,
      running: true,
    };

    if (this.state.keepAlive) {
      this.captureCmdToExit();
    }
  }

  captureCmdToExit() {
    // FIXME: this will remove all keypress listeners and start listening for q cmd
    process.stdin.removeAllListeners('keypress');
    process.stdin.on('keypress', async ch => {
      if (ch === 'q') {
        const disconnect = await connect();
        this.setState({ stopping: true });
        await stopApp(this.props.app.name);
        this.setState({ stopping: false, running: false, keepAlive: false });
        disconnect();
      } else {
        this.setState({ unknownCmd: ch });
      }
    });
  }

  render(props, state) {
    const { port, app: { name, instances } } = props;
    const { running, keepAlive, stopping } = state;

    return (
      <div>
        {running
          ? <Text green>
              <Text bold>{name}</Text> started {instances.length} instance(s) on
              port {port}.
            </Text>
          : <Text green>
              <Text bold>{name}</Text> has stopped.
            </Text>}
        <br />
        {keepAlive &&
          <Text>
            App is running foreground. Hit{' '}
            <Text bold green>
              q
            </Text>{' '}
            to stop
          </Text>}
        {stopping &&
          <div>
            <br />
            <Text green>
              <Spinner /> stopping...
            </Text>
          </div>}
        {!keepAlive && <Quit exitCode={0} />}
      </div>
    );
  }
}
