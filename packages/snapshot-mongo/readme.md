# @events/snapshot-mongo

This package receives a stream of commands, converts them to mongodb commands and persists them to a
mongodb database. It also takes care of optimistic locking to ensure data consistency.

# API

1. `version(config: PersistenceConfig, collections: CollectionMeta[]): Promise<SnapshotVersionMeta>`

```js
const { persist, version } = require('@events/snapshot-mongo');

const persistenceConfig = {
  store: 'mongodb://localhost/my_example_db',
};

const interestedCollections = [
  { name: 'users', version: '1.0.0' },
  { name: 'users', version: '2.0.0' },
  { name: 'posts', version: '1.0.0' },
  { name: 'posts', version: '1.2.0' },
];

// get the latest snapshot version from mongodb://localhost/my_example_db
const snapshotMeta = await version(persistenceConfig, interestedCollections);

const { snapshotVersion } = snapshotMeta;

console.log(snapshotVersion) // logs: 5
```

2. `persists`

```js
const storeConfig = {
  _: ['mongodb://localhost/my_example_db']
}

const interestedCollections = [
  { name: 'users', version: '1.0.0' },
  { name: 'users', version: '2.0.0' },
  { name: 'posts', version: '1.0.0' },
  { name: 'posts', version: '1.2.0' },
];

// create a persistence stream from a projection stream
const persistence$ = await persist(
  storeConfig,
  projection$,
  interestedCollections
);
```
