const { getCleanContent } = require("./antispam");
const { hasMessageImage, hasMessageImageOrVideo } = require("./lib/messageMedia");

function hasImage(message) {
  return hasMessageImage(message);
}

function hasImageOrVideo(message) {
  return hasMessageImageOrVideo(message);
}

const THREAD_RULES = [
  {
    name: "Feedback về lỗi sản phẩm",
    key: "bug",
    validate(message) {
      const text = getCleanContent(message);
      const isStarterPost =
        message.channel.isThread() && message.id === message.channel.id;

      if (isStarterPost) {
        if (!hasImageOrVideo(message)) {
          return {
            ok: false,
            reason: "Thread lỗi: bài post cần gửi kèm ảnh hoặc video lỗi."
          };
        }

        if (text.length < 10) {
          return {
            ok: false,
            reason: "Thread lỗi: cần mô tả luồng đi dẫn đến lỗi (ít nhất 10 ký tự)."
          };
        }

        return { ok: true, xp: 10 };
      }

      if (text.length >= 5) {
        return { ok: true, xp: 10 };
      }

      return {
        ok: false,
        reason: "Trả lời trong thread lỗi: cần ít nhất 5 ký tự."
      };
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

async function registerFeedbackThread(thread) {
  if (!feedbackChannelIds.has(thread.parentId)) {
    return;
  }

  let parentName = thread.parent?.name;

  if (!parentName && thread.parentId) {
    const parent = await thread.fetchParent().catch(() => null);
    parentName = parent?.name;
  }

  const rule =
    (parentName && findThreadRule(parentName)) || findThreadRule(thread.name);

  if (rule) {
    feedbackThreadIds.add(thread.id);
    console.log(
      `Thread feedback: ${thread.name} → quy tắc "${rule.key}"` +
        (parentName ? ` (kênh: ${parentName})` : "")
    );
  }
}

function isFeedbackThreadMessage(message) {
  return (
    message.channel.isThread() &&
    message.channel.parentId &&
    feedbackChannelIds.has(message.channel.parentId)
  );
}

function isFeedbackMessage(message) {
  return isFeedbackThreadMessage(message);
}

async function resolveThreadRule(message) {
  const channel = message.channel;

  if (!channel.isThread()) {
    return findThreadRule(channel.name);
  }

  let parentName = channel.parent?.name;

  if (!parentName && channel.parentId) {
    const parent = await channel.client.channels
      .fetch(channel.parentId)
      .catch(() => null);
    parentName = parent?.name;
  }

  if (parentName) {
    const ruleFromParent = findThreadRule(parentName);

    if (ruleFromParent) {
      return ruleFromParent;
    }
  }

  return findThreadRule(channel.name);
}

function getThreadRule(message) {
  const channel = message.channel;

  if (!channel.isThread()) {
    return findThreadRule(channel.name);
  }

  const parentName = channel.parent?.name;

  if (parentName) {
    const ruleFromParent = findThreadRule(parentName);

    if (ruleFromParent) {
      return ruleFromParent;
    }
  }

  return findThreadRule(channel.name);
}

function getFeedbackChannelName(message) {
  if (message.channel.isThread()) {
    const parentName = message.channel.parent?.name;

    if (parentName) {
      return `${parentName} / ${message.channel.name}`;
    }

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
        await registerFeedbackThread(thread);
      }
    }

    const archived = await channel.threads.fetchArchived().catch(() => null);
    if (archived) {
      for (const thread of archived.threads.values()) {
        await thread.join().catch(() => {});
        await registerFeedbackThread(thread);
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
  isFeedbackThreadMessage,
  getThreadRule,
  resolveThreadRule,
  getFeedbackChannelName,
  joinFeedbackThreads,
  feedbackChannelIds
};
