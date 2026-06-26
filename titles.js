const LEVEL_TITLES = {
  0: "Chưa vào cuộc",
  1: "Người mới góp ý",
  2: "Feedback enjoyer",
  3: "Main character feedback",
  4: "Sigma tester",
  5: "CEO góp ý (không lương)"
};

function getLevelTitle(level) {
  if (!level || level < 1) {
    return LEVEL_TITLES[0];
  }

  return LEVEL_TITLES[Math.min(level, 5)] ?? LEVEL_TITLES[5];
}

function getDisplayTitle(userId, level) {
  const { getUserXp, getActiveTempTitle } = require("./xp");
  const user = getUserXp(userId);
  const temp = getActiveTempTitle(user);

  if (temp) {
    return `${temp} _(tạm)_`;
  }

  return getLevelTitle(level);
}

module.exports = { LEVEL_TITLES, getLevelTitle, getDisplayTitle };
