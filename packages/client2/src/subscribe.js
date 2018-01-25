const { params } = process.env;

const { json, verbose, config } = JSON.parse(params);

console.log({ json, verbose, config });

setTimeout(() => {
  console.log('exiting');
  process.exit(0);
}, 500);
