// @jsx h
import { Text, h } from 'ink';

export default ({ children }) =>
  <Text>
    {require('util').inspect(children[0], { depth: null })}
  </Text>;
