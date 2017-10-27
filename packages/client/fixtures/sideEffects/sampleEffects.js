const sleep = async ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = [
  {
    when: {
      type: 'USER_REGISTERED',
    },
    execute: async event => {
      await sleep(100);
      console.log(
        '------------------------------------ side effect',
        event.payload.uid
      );
    },
  },
  {
    when: (event, projections) => {
      return event.type === 'USER_EMAIL_UPDATED';
    },
    execute: async event => {
      throw new Error('must failed');
    },
  },
];
