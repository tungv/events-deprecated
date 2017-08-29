const toKeyValue = string => {
  const colonIdx = string.indexOf(':');
  const key = string.slice(0, colonIdx).trim();
  const value = string.slice(colonIdx + 1).trim();

  if (!key) {
    return {};
  }

  return { [key]: value };
};

const parseMessage = string => {
  const lines = string.split('\n').map(toKeyValue);
  const msg = lines.reduce(Object.assign, {});
  if (msg.data) {
    msg.data = JSON.parse(msg.data);
  }

  return msg;
};

module.exports = parseMessage;
