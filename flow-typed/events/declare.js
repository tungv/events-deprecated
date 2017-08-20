/* @flow */
type EventsServerInstances = {
  pid: number,
  uptime: number,
  ram: number,
  cpu: number,
};

type EventsServerApp = {
  name: string,
  instances: EventsServerInstances[],
};
