const {
  checkAntiSpam,
  buildAntiSpamRecord,
  allocateDailyXp
} = require("./antispam");
const { getUserXp, withXpWrite, getLevel } = require("./xp");
const { buildFeedbackReply } = require("./feedbackReply");
const { buildLevelUpMessage } = require("./numberPickUi");
const { appendXpLog } = require("./storage/xpLog");
const log = require("./lib/logger");

async function processFeedbackXp(message, rule, check) {
  const userId = message.author.id;
  const userData = getUserXp(userId);
  const spamCheck = await checkAntiSpam(message, userData, check.xp, {
    userId,
    threadId: message.channel.id
  });

  if (!spamCheck.ok) {
    return { ok: false, reason: spamCheck.reason };
  }

  const writeResult = withXpWrite(userId, (user) => {
    const levelBefore = user.level ?? getLevel(user.xp ?? 0);

    const granted = allocateDailyXp(
      user,
      [{ key: "base", amount: check.xp }],
      message.author
    );
    const totalGranted = granted.base ?? 0;

    if (totalGranted <= 0) {
      return { ok: false, reason: "daily_cap" };
    }

    user.xp = (user.xp ?? 0) + totalGranted;

    Object.assign(
      user,
      buildAntiSpamRecord(userId, {
        fingerprint: spamCheck.fingerprint,
        fingerprints: spamCheck.fingerprints,
        normalized: spamCheck.normalized,
        userData: user,
        xpAmount: totalGranted,
        threadId: message.channel.id
      })
    );

    user.level = getLevel(user.xp);
    const leveledUp = user.level > levelBefore;
    const capNote =
      totalGranted < check.xp
        ? `⚠️ Đã đạt cap XP hôm nay — nhận **${totalGranted}/${check.xp}** XP.`
        : null;

    return {
      ok: true,
      granted,
      totalGranted,
      capNote,
      leveledUp,
      level: user.level
    };
  });

  if (writeResult.ok === false) {
    return {
      ok: false,
      reason:
        writeResult.reason === "daily_cap"
          ? "Chống spam: đã hết quota XP hôm nay."
          : "Không thể cộng XP."
    };
  }

  appendXpLog({
    userId,
    amount: writeResult.totalGranted,
    level: writeResult.level,
    granted: writeResult.granted,
    leveledUp: writeResult.leveledUp,
    source: "feedback"
  });

  log.info("XP granted", {
    userId,
    amount: writeResult.totalGranted,
    level: writeResult.level
  });

  return {
    ok: true,
    totalGranted: writeResult.totalGranted,
    level: writeResult.level,
    leveledUp: writeResult.leveledUp,
    reply: writeResult.leveledUp
      ? buildLevelUpMessage(userId, writeResult.level)
      : buildFeedbackReply(writeResult)
  };
}

module.exports = { processFeedbackXp };
