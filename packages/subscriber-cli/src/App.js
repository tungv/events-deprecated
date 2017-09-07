/* @jsx h */
import { Component, Text, h } from 'ink';
import Spinner from 'ink-spinner';
import prettyMs from 'pretty-ms';
import subscribe from '@events/subscriber';

const LineBreak = props => (
  <div>
    <Text {...props}>{'-'.repeat(process.stdout.columns)}</Text>
  </div>
);

class TimeElapsed extends Component {
  interval = null;

  start() {
    const { from } = this.props;

    this.interval = setInterval(() => {
      const now = Date.now();
      if (now > from) {
        this.setState({ ms: now - from });
      }
    }, 1000);
  }

  componentDidMount() {
    if (!this.props.stopped) this.start();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.stopped !== this.props.stopped) {
      nextProps.stopped ? clearInterval(this.interval) : this.start();
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render(props, state) {
    return <Text {...props}>{state.ms > 0 && prettyMs(state.ms)}</Text>;
  }
}

export default class App extends Component {
  state = {
    status: 'CONNECTING',
    last5Events: [],
    eventCount: 0,
  };

  interval = null;

  async componentDidMount() {
    const { url, lastEventId, burstCount, burstTime } = this.props;

    const { raw$, events$, abort } = subscribe(`${url}/subscribe`, {
      'Last-Event-ID': lastEventId,
      'burst-count': burstCount,
      'burst-time': burstTime,
    });

    events$
      .bufferWithTimeOrCount(500)
      .filter(array => array.length)
      .onValue(events => {
        this.setState(state => ({
          eventCount: state.eventCount + events.length,
          last5Events: [...events.reverse(), ...state.last5Events].slice(0, 5),
        }));
      });

    this.setState({ connectingTS: Date.now() });

    // FIXME: this will remove all keypress listeners and start listening for any key press
    process.stdin.removeAllListeners('keypress');
    process.stdin.on('keypress', abort);

    raw$.onEnd(() => {
      this.setState({ status: 'ABORTED' });
      setTimeout(() => process.exit(0), 10);
    });

    raw$.onError(error => {
      this.setState({ status: 'ABORTED', error });
    });

    const firstMessage = await raw$.take(1).toPromise();
    const connected = firstMessage.slice(0, 3) === ':ok';
    if (connected) {
      this.setState({ status: 'CONNECTED', connectedTS: Date.now() });
    } else {
      this.setState({
        status: 'ABORTED',
        connectedTS: Date.now(),
        error: firstMessage,
      });
    }
  }

  render(props, state) {
    if (state.status === 'CONNECTING') {
      return (
        <div>
          <Spinner green /> connecting to {props.url}
        </div>
      );
    }

    const summaryElement = (
      <div>
        <div>Events server url: {props.url}</div>
        <div>Last-Event-ID: {props.lastEventId}</div>
        {state.connectedTS > 0 && (
          <div>
            total time:{' '}
            <TimeElapsed
              from={state.connectedTS}
              stopped={state.status === 'ABORTED'}
            />
          </div>
        )}
        {state.eventCount > 0 && <div>total events: {state.eventCount}</div>}

        {state.last5Events.length > 0 && (
          <div>
            <LineBreak gray />
            <div>
              <Text bold>
                Latest events<br />
                <br />
              </Text>
            </div>
            <div>
              {state.last5Events.map(event => (
                <div>
                  <Text green>{String(event.id).padStart(6, ' ')}</Text>
                  {': '}
                  <Text bold>{event.type}</Text>
                  <br />
                  <Text>
                    {typeof event.payload !== 'object' &&
                      '     ' + event.payload}
                    {typeof event.payload === 'object' &&
                      Object.keys(event.payload)
                        .slice(0, 5)
                        .map(prop => (
                          <div>
                            {'       '}
                            <Text italic>{prop}</Text>:{' '}
                            <Text dim>
                              {maxLength(
                                JSON.stringify(event.payload[prop]),
                                process.stdout.columns - 22 - prop.length
                              )}
                            </Text>
                          </div>
                        ))}
                    {Object.keys(event.payload).length > 5 && '…'}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    if (state.status === 'ABORTED') {
      return (
        <div>
          <div>
            <Text red>ABORTED</Text>
            <br />
            <Text red>{state.error}</Text>
          </div>
          {summaryElement}
        </div>
      );
    }

    return (
      <div>
        <div>
          <span>
            <Text green>
              Connected after {prettyMs(
                state.connectedTS - state.connectingTS
              )}!
            </Text>
            <br />
            <Spinner green /> Subscribing…{' '}
            <Text bold>(press any key to stop)</Text>
          </span>
        </div>
        {summaryElement}
      </div>
    );
  }
}

const maxLength = (str, length) =>
  `${str.slice(0, length)}${str.length > length ? '…' : ''}`;
