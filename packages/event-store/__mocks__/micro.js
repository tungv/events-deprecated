const micro = jest.genMockFromModule('micro');

module.exports = micro;
module.exports.json = async (req) => {
  if (typeof req.body === 'object') {
    return req.body
  }

  throw new Error('Invalid JSON');
};
