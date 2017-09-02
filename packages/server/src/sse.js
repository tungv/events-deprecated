import { once } from 'lodash/fp';

function flush(response) {
  if (response.flush && response.flush.name !== 'deprecated') {
    response.flush();
  }
}

const toOutput = events => `id: ${events[events.length - 1].id}
event: INCMSG
data: ${JSON.stringify(events)}

`;

export const addClient = (src, opts, match, req, res) => {
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream;charset=UTF-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(':ok\n\n');

  // cast to integer
  const retry = opts.retry | 0;

  if (retry) {
    res.write('retry: ' + retry + '\n');
  }

  flush(res);

  const subscription = src
    .filter(x => x)
    .bufferWithTimeOrCount(opts.time, opts.count)
    .filter(b => b.length)
    .map(toOutput)
    .observe(block => {
      opts.debug && console.log('send to %s %s', req.url, block);
      res.write(block);
    });

  const removeClient = once(() => {
    opts.debug && console.log('removing', req.url);
    subscription.unsubscribe();
    res.end();
  });

  req.on('end', removeClient);
  req.on('close', removeClient);
  res.on('finish', removeClient);
};
