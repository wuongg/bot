const { runWithXpLock } = require("../antispam");
const { buildSpamReply } = require("../spamMessages");
const { processFeedbackXp } = require("../feedbackXpPipeline");
const { syncMemberLevelRole } = require("../roles");
const { buildMentionReply, shouldReplyToMention } = require("../mentionReply");
const {
  isFeedbackMessage,
  getThreadRule,
  getFeedbackChannelName
} = require("../feedback");
const log = require("../lib/logger");

function registerMessageCreate(client) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) {
      return;
    }

    if (shouldReplyToMention(message)) {
      const content = await buildMentionReply(message);
      await message.reply({ content }).catch(() => {});
      return;
    }

    if (message.content === "!ping") {
      message.reply("Pong!");
      return;
    }

    if (message.content === "!rank" || message.content === "!leaderboard") {
      await message
        .reply("Dùng slash command `/stalk` hoặc `/leaderboard` nhé!")
        .catch(() => {});
      return;
    }

    if (!isFeedbackMessage(message)) {
      return;
    }

    await runWithXpLock(message.author.id, async () => {
      const threadName = getFeedbackChannelName(message);
      const rule = getThreadRule(message);

      if (!rule) {
        log.debug("Skip XP: no rule", { thread: threadName });
        return;
      }

      const check = rule.validate(message);

      if (!check.ok) {
        log.debug("Skip XP: validation", { user: message.author.tag, reason: check.reason });
        return;
      }

      const result = await processFeedbackXp(message, rule, check);

      if (!result.ok) {
        log.info("XP blocked", { user: message.author.tag, reason: result.reason });
        await message.reply(buildSpamReply(result.reason)).catch(() => {});
        return;
      }

      await syncMemberLevelRole(message.guild, message.author.id, result.level);
      await message.reply(result.reply).catch(() => {});
      await message.react("⭐").catch(() => {});
    });
  });
}

module.exports = { registerMessageCreate };
