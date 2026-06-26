const { getLevel } = require("./xpLevel");
const { getBackend } = require("./storage/backend");

function store() {
  return getBackend().users;
}

function getUserXp(userId) {
  return store().get(userId);
}

function getLeaderboard(limit = 10) {
  return store().getLeaderboard(limit);
}

function getAllUsersWithXp() {
  return store().getAll();
}

function updateUserMeta(userId, patch) {
  return withXpWrite(userId, (user) => {
    Object.assign(user, patch);
    return user;
  }).user;
}

function setTempTitle(userId, title, hours = 24) {
  return updateUserMeta(userId, {
    tempTitle: {
      text: title,
      expiresAt: Date.now() + hours * 3_600_000
    }
  });
}

function getActiveTempTitle(user) {
  if (!user?.tempTitle) {
    return null;
  }

  if (user.tempTitle.expiresAt <= Date.now()) {
    return null;
  }

  return user.tempTitle.text;
}

function withXpWrite(userId, updater) {
  return store().withWrite(userId, updater);
}

function grantBonusXp(userId, amount) {
  return withXpWrite(userId, (user) => {
    const previousLevel = user.level ?? getLevel(user.xp ?? 0);
    user.xp = (user.xp ?? 0) + amount;
    user.level = getLevel(user.xp);

    return {
      leveledUp: user.level > previousLevel,
      previousLevel,
      bonusXp: amount
    };
  });
}

function cleanupExpiredTempTitles() {
  return store().cleanupTempTitles();
}

function setUserXp(userId, xp) {
  return withXpWrite(userId, (user) => {
    user.xp = Math.max(0, xp);
    user.level = getLevel(user.xp);
    return { xp: user.xp, level: user.level };
  });
}

function resetUser(userId) {
  store().delete(userId);
}

module.exports = {
  getLevel,
  getUserXp,
  getLeaderboard,
  getAllUsersWithXp,
  updateUserMeta,
  setTempTitle,
  getActiveTempTitle,
  grantBonusXp,
  withXpWrite,
  cleanupExpiredTempTitles,
  setUserXp,
  resetUser
};
