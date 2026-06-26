const { getBackend } = require("./storage/backend");

function picks() {
  return getBackend().picks;
}

function getNextPickLevel(userId, currentLevel) {
  return picks().getNextPickLevel(userId, currentLevel);
}

function getUserNumbers(userId) {
  return picks().getUserNumbers(userId);
}

function pickNumber(userId, number, currentLevel) {
  return picks().pickNumber(userId, number, currentLevel);
}

function getUserIdForNumber(number) {
  return picks().getUserIdForNumber(number);
}

function getNumbersData() {
  return picks().getAllData();
}

function formatUserNumbers(userId) {
  const rows = getUserNumbers(userId);

  if (rows.length === 0) {
    return "Bạn chưa chọn số nào. Lên level rồi bấm nút **Chọn số**.";
  }

  const lines = rows.map((pick) => `Level ${pick.level} → **${pick.number}**`);
  return `🔢 **Số bạn đã chọn:**\n${lines.join("\n")}`;
}

module.exports = {
  pickNumber,
  getUserNumbers,
  getNextPickLevel,
  formatUserNumbers,
  getUserIdForNumber,
  getNumbersData
};
