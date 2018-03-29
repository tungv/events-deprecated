const micro = require('micro');
const { router, get, post } = require('microrouter');

const factory = async userConfig => {
  const { queue, http } = await parseConfig(userConfig || {});

  const service = router(
    get(http.queryPath, async req => {
      const lastEventId = req.query.lastEventId;

      return queue.query({ lastEventId });
    }),
    post(http.commitPath, async req => {
      const body = await micro.json(req);

      if (typeof body.type !== 'string') {
        throw micro.createError(400, 'type is required');
      }

      return queue.commit(body);
    })
  );

  const server = micro(service);

  const start = () =>
    new Promise((resolve, reject) => {
      server.listen(http.port, err => {
        if (err) {
          console.error(
            'cannot start on port %d. Error: %s',
            http.port,
            err.message
          );
          reject(err);
        } else {
          console.log('start listening on port %d', http.port);
          resolve(server);
        }
      });
    });

  return start;
};

const parseConfig = ({ queue: queueConfig = {}, http: httpConfig = {} }) => {
  const adapterPkgName = queueConfig.driver || './in-memory';
  const adapter = require(adapterPkgName);

  const {
    commitPath = '/commit',
    subscribePath = '/subscribe',
    queryPath = '/query',
    port,
  } = httpConfig;

  if (Number.isNaN(port)) {
    console.error('port is unspecified');
    process.exit(1);
  }

  return {
    queue: adapter(queueConfig),
    http: {
      commitPath,
      subscribePath,
      queryPath,
      port,
    },
  };
};

module.exports = factory;
