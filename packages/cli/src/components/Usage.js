/*
  @flow
  @jsx h
*/

import { Indent, Text, h } from 'ink';
import flow from 'lodash/fp/flow';
import map from 'lodash/fp/map';
import max from 'lodash/fp/max';
import SelectInput from 'ink-select-input';

import Quit from './Quit';

const commands = [
  ['start', 'start a new events server instance'],
  ['stop', 'stop a running events server instance', '[name]'],
  ['list', 'list all running instances'],
];

const longestCommandLength = flow(map('0.length'), max)(commands);
const commandAsKeyValue = map(
  ([cmd, desc, options]) => ({
    cmd,
    desc,
    cmdLength: longestCommandLength,
    options: options || '',
  }),
  commands
);

const Usage = ({ onCommandSelected }: { onCommandSelected: Function }) =>
  <div>
    <Text green>Usage: es [command] [options]</Text>
    <br />
    <br />
    <Text>Commands:</Text>
    <br />
    <br />
    <SelectInput
      items={commandAsKeyValue}
      itemComponent={CommandItem}
      onSelect={onCommandSelected}
    />

    <br />
    <Text>
      please use ↑ and ↓ array keys to move cursor. Hit Enter to switch to that
      command.
    </Text>
    {/* <Quit /> */}
  </div>;

const CommandItem = ({ cmd, desc, cmdLength, options, isSelected }) =>
  <Indent>
    <div>
      <Text bold>
        {cmd}
      </Text>
      {isSelected &&
        <Text gray>
          {' '}{options}
        </Text>}
    </div>
    <div>
      <Indent>
        {desc}
      </Indent>
    </div>
  </Indent>;
export default Usage;
