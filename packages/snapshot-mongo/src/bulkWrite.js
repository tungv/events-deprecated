export default (coll, ops) => {
  return coll.bulkWrite(ops);
};
