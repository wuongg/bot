const { runWithXpLock } = require("../antispam");
const { buildSpamReply } = require("../spamMessages");
const { processFeedbackXp } = require("../feedbackXpPipeline");
const { syncMemberLevelRole } = require("../roles");
const { buildMentionReply, shouldReplyToMention } = require("../mentionReply");
const {
  isFeedbackThreadMessage,
  resolveThreadRule,
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

    if (!isFeedbackThreadMessage(message)) {
      return;
    }

    await message.channel.join().catch(() => {});

    await runWithXpLock(message.author.id, async () => {
      const threadName = getFeedbackChannelName(message);
      const rule = await resolveThreadRule(message);

      if (!rule) {
        log.warn("Skip XP: no rule", { thread: threadName, parentId: message.channel.parentId });
        return;
      }

      const check = rule.validate(message);

      if (!check.ok) {
        log.info("Skip XP: validation", {
          user: message.author.tag,
          thread: threadName,
          reason: check.reason
        });
        return;
      }

      const claimed = await message.react("⭐").then(() => true).catch(() => false);

      if (!claimed) {
        log.info("XP skip: already handled", { messageId: message.id });
        return;
      }

      const result = await processFeedbackXp(message, rule, check);

      if (!result.ok) {
        log.info("XP blocked", { user: message.author.tag, reason: result.reason });
        await message.reactions.cache
          .find((reaction) => reaction.emoji.name === "⭐")
          ?.users.remove(message.client.user.id)
          .catch(() => {});
        await message.reply(buildSpamReply(result.reason)).catch(() => {});
        return;
      }

      await syncMemberLevelRole(message.guild, message.author.id, result.level);
      await message.reply(result.reply).catch(() => {});
    });
  });
}

module.exports = { registerMessageCreate };
