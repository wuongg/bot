const { isFeedbackMessage } = require("./feedback");
const { getUserXp } = require("./xp");
const { getUserNumbers } = require("./numbers");
const { isEnabled: isMentionAiEnabled, classifyMention } = require("./lib/mentionAi");
const { buildFaqReply, matchFaq } = require("./lib/mentionFaq");
const {
  normalizeInput,
  isBlockedInput,
  checkRateLimit,
  sanitizeOutput,
  BOT_CHIU,
  COOLDOWN_MS
} = require("./lib/mentionGuard");
const log = require("./lib/logger");

const GREETINGS = [
  "Chào **{name}**! Cần gì cứ hỏi — xp, feedback, lệnh bot đều được 👋",
  "Hi **{name}**! Bot online, sẵn sàng nhận góp ý (và cộng XP) ⭐",
  "Yo **{name}**! Hỏi tùy ý: *xp của tôi*, *feedback ở đâu*, *bot làm gì*…"
];

const ROLE_REPLY =
  "**{name}** ơi, mình là bot **Feedback XP** — nhận góp ý trong thread, cộng XP, level up, chọn số. Gõ `/help` nhé!";

const HINT_REPLY =
  "**{name}** ơi, mình chỉ rõ về **feedback & XP** thôi. Thử hỏi: *xp của tôi*, *feedback ở đâu*, *sao không được xp*, hoặc `/help`.";

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function isBotMentioned(message) {
  return message.mentions.users.has(message.client.user.id);
}

function getContentWithoutBotMention(message) {
  return message.content
    .replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "")
    .trim();
}

function normalizeGreetingText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGreeting(text) {
  if (!text) {
    return true;
  }

  const raw = text.trim();
  const normalized = normalizeGreetingText(raw);

  if (!normalized) {
    return true;
  }

  if (/^h+i+$/i.test(normalized.replace(/\s/g, ""))) {
    return true;
  }

  if (/^he+y+$/i.test(normalized.replace(/\s/g, ""))) {
    return true;
  }

  if (/^yo+$/i.test(normalized.replace(/\s/g, ""))) {
    return true;
  }

  const greetingPattern =
    /^(chao|xin chao|hello|hi|hey|yo|helo|he lu|chao ban|chao nha|chao em)(\s|$|[!.?,])/i;

  return greetingPattern.test(raw) || greetingPattern.test(normalized);
}

function isUserSelfQuestion(text) {
  if (!text?.trim()) {
    return false;
  }

  const normalized = normalizeGreetingText(text);

  return (
    /\b(tao|toi|tui|minh|mình)\s+(la ai|la gi)\b/i.test(normalized) ||
    /\b(xp|level|cap do|rank)\s+(cua toi|cua tao|toi|tao|may|mình)\b/i.test(normalized) ||
    /\b(tao|toi|minh|mình)\s+(co|đang|dang)\s*(bao nhieu\s*)?(xp|level)\b/i.test(normalized) ||
    /\b(xp|level)\s+(cua|cuar?)\s*(tao|toi|minh|mình)\b/i.test(normalized)
  );
}

function isBotRoleQuestion(text) {
  if (!text?.trim() || isUserSelfQuestion(text)) {
    return false;
  }

  const normalized = normalizeGreetingText(text);

  return (
    /\b(may|ban|bot|mai|mày)\s+(la ai|la gi|lam gi|dang lam gi|o day)\b/i.test(
      normalized
    ) ||
    /\b(bot|may|mày)\b.*\b(lam gi|chuc nang|nhiem vu|muc dich)\b/i.test(normalized) ||
    /\b(what do you do|who are you)\b/i.test(normalized)
  );
}

function containsGreeting(text) {
  if (!text?.trim()) {
    return true;
  }

  if (isUserSelfQuestion(text) || isBotRoleQuestion(text) || matchFaq(text)) {
    return false;
  }

  if (isGreeting(text)) {
    return true;
  }

  const normalized = normalizeGreetingText(text);

  if (/\bh+i+\b/.test(normalized)) {
    return true;
  }

  if (/\b(chao|hello|hey|he+y+|yo+|xin chao)\b/.test(normalized)) {
    return true;
  }

  if (/\bchao\s+(may|mai|ban|em|nha|mày)\b/.test(normalized)) {
    return true;
  }

  return false;
}

function getDisplayName(message) {
  return (
    message.member?.displayName ??
    message.author.displayName ??
    message.author.username
  );
}

function buildGreeting(name) {
  return pickRandom(GREETINGS).replace("{name}", name);
}

function buildRoleReply(name) {
  return ROLE_REPLY.replace("{name}", name);
}

function buildHintReply(name) {
  return HINT_REPLY.replace("{name}", name);
}

function buildRateLimitReply(name, waitMs) {
  const seconds = Math.max(1, Math.ceil(waitMs / 1000));
  return `${name} ơi, hơi nhanh rồi — chờ **${seconds}s** rồi @ lại nhé ⏳`;
}

function buildSelfReply(message) {
  const ctx = buildMentionContext(message);
  const name = ctx.displayName;

  if (!ctx.hasXp) {
    return (
      `${name} ơi, bạn là thành viên server — **chưa có XP**. ` +
      `Gửi feedback đúng thread để bắt đầu. Gõ \`/stalk\` xem sau khi có XP.`
    );
  }

  return (
    `${name} ơi, bạn đang **Level ${ctx.level}** · **${ctx.xp} XP**. ` +
    `Số đã chọn: ${ctx.pickedNumbers}. Chi tiết: \`/stalk\`.`
  );
}

function buildMentionContext(message) {
  const name = getDisplayName(message);
  const user = getUserXp(message.author.id);
  const picks = getUserNumbers(message.author.id);
  const xp = user?.xp ?? 0;
  const level = user?.level ?? 0;

  return {
    displayName: name,
    level,
    xp,
    hasXp: xp > 0,
    pickedNumbers:
      picks.length > 0
        ? picks.map((pick) => `Level ${pick.level} → ${pick.number}`).join(", ")
        : "chưa chọn số nào"
  };
}

function resolveFromAi(ai, message, text, name) {
  if (ai.reply) {
    const safe = sanitizeOutput(ai.reply);

    if (safe) {
      return safe;
    }

    log.warn("Mention AI output blocked", { userId: message.author.id });
  }

  if (ai.intent === "greeting" || containsGreeting(text)) {
    return buildGreeting(name);
  }

  if (isUserSelfQuestion(text)) {
    return buildSelfReply(message);
  }

  if (isBotRoleQuestion(text)) {
    return buildRoleReply(name);
  }

  const faq = buildFaqReply(text, name);

  if (faq) {
    return faq;
  }

  if (ai.intent === "deflect") {
    return buildHintReply(name);
  }

  return buildHintReply(name);
}

async function replyWithAi(message, text, name) {
  const ai = await classifyMention(text, buildMentionContext(message));
  return resolveFromAi(ai, message, text, name);
}

function resolveWithoutAi(message, text, name) {
  if (isUserSelfQuestion(text)) {
    return buildSelfReply(message);
  }

  const faq = buildFaqReply(text, name);

  if (faq) {
    return faq;
  }

  if (isBotRoleQuestion(text)) {
    return buildRoleReply(name);
  }

  if (containsGreeting(text)) {
    return buildGreeting(name);
  }

  return buildHintReply(name);
}

async function buildMentionReply(message) {
  const rest = getContentWithoutBotMention(message);
  const name = getDisplayName(message);
  const text = normalizeInput(rest);

  if (isBlockedInput(rest)) {
    log.info("Mention input blocked", { userId: message.author.id });
    return BOT_CHIU;
  }

  if (isMentionAiEnabled()) {
    const rate = checkRateLimit(message.author.id);

    if (!rate.ok) {
      return buildRateLimitReply(name, rate.waitMs);
    }

    try {
      return await replyWithAi(message, text, name);
    } catch (error) {
      log.warn("Mention AI failed, fallback rules", { message: error.message });
    }
  }

  return resolveWithoutAi(message, text, name);
}

function shouldReplyToMention(message) {
  return isBotMentioned(message) && !isFeedbackMessage(message);
}

module.exports = {
  buildMentionReply,
  shouldReplyToMention,
  isBotMentioned,
  getContentWithoutBotMention,
  isGreeting,
  isBotRoleQuestion,
  isUserSelfQuestion,
  containsGreeting,
  COOLDOWN_MS
};
