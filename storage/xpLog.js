const { getBackend } = require("./backend");

function appendXpLog(entry) {
  getBackend().logs.append(entry);
}

function getUserLogs(userId, limit = 20) {
  return getBackend().logs.getForUser(userId, limit);
}

module.exports = { appendXpLog, getUserLogs };
