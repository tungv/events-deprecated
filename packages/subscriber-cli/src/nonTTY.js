import subscribe from '@events/subscriber';

export default (async function({ url, lastEventId, burstTime, burstCount }) {
  const { raw$, events$, abort } = subscribe(url, {
    'Last-Event-ID': lastEventId,
    'burst-count': burstCount,
    'burst-time': burstTime,
  });

  process.on('SIGINT', abort);

  const firstMessage = await raw$.take(1).toPromise();
  if (firstMessage.slice(0, 3) !== ':ok') {
    process.exit(1);
    return;
  }

  events$.onValue(json => process.stdout.write(`${JSON.stringify(json)}\n`));
});
