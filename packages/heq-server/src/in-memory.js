const mitt = require('mitt');
const kefir = require('kefir');

const adapter = () => {
  const emitter = mitt();
  const events = [];
  let id = 0;

  const commit = event => {
    events[id] = event;
    event.id = ++id;
    emitter.emit('data', event);
    return event;
  };

  const query = ({ lastEventId }) => {
    return events.slice(lastEventId);
  };

  const changes$ = kefir.fromEvents(emitter, 'data');

  return { commit, changes$, query };
};

module.exports = adapter;
