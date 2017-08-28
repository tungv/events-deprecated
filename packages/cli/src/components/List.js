import { h, Component, Text } from 'ink';
import Spinner from 'ink-spinner';
import Table from 'ink-table';
import prettyBytes from 'pretty-bytes';

import { connect, list } from '../utils/async-pm2';
import Quit from './Quit';

export default class List extends Component {
  state = {
    apps: null,
  };
  async componentDidMount() {
    const disconnect = await connect();
    const apps = await list();
    disconnect();
    this.setState({ apps });
  }

  render(props, { apps }) {
    if (!apps) {
      return (
        <div>
          <Text>
            <Spinner green /> Loading apps...
          </Text>
        </div>
      );
    }

    const tableData = apps.map(app => ({
      name: app.name,
      instances: app.instances.length,
      cpu: app.instances.map(i => `${i.cpu}%`).join(', '),
      ram: app.instances.map(i => `${prettyBytes(i.ram)}`).join(', '),
    }));

    return (
      <div>
        <Table data={tableData} />
        <Quit exitCode={0} />
      </div>
    );
  }
}
