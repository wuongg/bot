function hasImage(message) {
  return message.attachments.some((file) => {
    const type = file.contentType ?? "";
    return type.startsWith("image/");
  });
}

function hasImageOrVideo(message) {
  return message.attachments.some((file) => {
    const type = file.contentType ?? "";
    return type.startsWith("image/") || type.startsWith("video/");
  });
}

const { getCleanContent } = require("./antispam");

const THREAD_RULES = [
  {
    name: "Feedback về lỗi sản phẩm",
    key: "bug",
    validate(message) {
      if (!hasImageOrVideo(message)) {
        return {
          ok: false,
          reason: "Thread lỗi: cần gửi kèm ảnh hoặc video lỗi."
        };
      }

      const text = getCleanContent(message);
      if (text.length < 10) {
        return {
          ok: false,
          reason: "Thread lỗi: cần mô tả luồng đi dẫn đến lỗi (ít nhất 10 ký tự)."
        };
      }

      return { ok: true, xp: 10 };
    }
  },
  {
    name: "Feedback cải thiện sản phẩm",
    key: "product",
    validate(message) {
      const text = getCleanContent(message);

      if (hasImage(message)) {
        return { ok: true, xp: 20 };
      }

      if (text.length >= 5) {
        return { ok: true, xp: 10 };
      }

      return {
        ok: false,
        reason: "Thread sản phẩm: cần mô tả ý tưởng (≥ 5 ký tự) hoặc gửi ảnh minh họa."
      };
    }
  },
  {
    name: "Feedback cải thiện UI/UX",
    key: "ui",
    validate(message) {
      const text = getCleanContent(message);

      if (hasImage(message)) {
        return { ok: true, xp: 20 };
      }

      if (text.length >= 5) {
        return { ok: true, xp: 10 };
      }

      return {
        ok: false,
        reason: "Thread UI/UX: cần mô tả feedback (≥ 5 ký tự) hoặc gửi ảnh minh họa."
      };
    }
  }
];

const feedbackParentNames = ["feedback", ...THREAD_RULES.map((rule) => rule.name)];

const feedbackChannelIds = new Set();
const feedbackThreadIds = new Set();

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function findThreadRule(name) {
  const normalized = normalizeName(name);
  return (
    THREAD_RULES.find((rule) => normalizeName(rule.name) === normalized) ?? null
  );
}

function isFeedbackParentChannel(channel) {
  const normalized = normalizeName(channel.name);
  return feedbackParentNames.some((name) => normalizeName(name) === normalized);
}

function registerFeedbackChannel(channel) {
  feedbackChannelIds.add(channel.id);
  console.log(`Kênh feedback: ${channel.name} (${channel.id})`);
}

function registerFeedbackThread(thread) {
  const rule = findThreadRule(thread.name);

  if (rule) {
    feedbackThreadIds.add(thread.id);
    console.log(`Thread feedback: ${thread.name} → quy tắc "${rule.key}"`);
  }
}

function isFeedbackMessage(message) {
  if (!message.channel.isThread()) {
    return false;
  }

  if (!feedbackChannelIds.has(message.channel.parentId)) {
    return false;
  }

  return !!findThreadRule(message.channel.name);
}

function getThreadRule(message) {
  if (!message.channel.isThread()) {
    return findThreadRule(message.channel.name);
  }

  return findThreadRule(message.channel.name);
}

function getFeedbackChannelName(message) {
  if (message.channel.isThread()) {
    return message.channel.name;
  }

  return message.channel.name;
}

async function joinFeedbackThreads(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  for (const channelId of feedbackChannelIds) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.threads) continue;

    const active = await channel.threads.fetchActive().catch(() => null);
    if (active) {
      for (const thread of active.threads.values()) {
        await thread.join().catch(() => {});
        registerFeedbackThread(thread);
      }
    }
  }
}

module.exports = {
  THREAD_RULES,
  isFeedbackParentChannel,
  registerFeedbackChannel,
  registerFeedbackThread,
  isFeedbackMessage,
  getThreadRule,
  getFeedbackChannelName,
  joinFeedbackThreads,
  feedbackChannelIds
};
