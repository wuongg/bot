const { getBackend } = require("./storage/backend");
const { hashMessageImages } = require("./lib/imageHash");
const { findSimilarText } = require("./lib/textSimilarity");
const { analyzeContentQuality } = require("./lib/contentQuality");
const {
  checkGlobalSimilarity,
  recordGlobalSample
} = require("./lib/globalContentGuard");
const {
  isAltBlocked,
  recordAltStrike,
  getAltBlockReason
} = require("./lib/altGuard");
const {
  getEffectiveDailyCap,
  getEffectiveVelocityCap,
  isNewAccount
} = require("./lib/accountTrust");
const log = require("./lib/logger");

function envBool(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value === "true" || value === "1";
}

const COOLDOWN_MS =
  (Number(process.env.XP_COOLDOWN_MINUTES) || 5) * 60 * 1000;
const THREAD_COOLDOWN_MS =
  (Number(process.env.THREAD_COOLDOWN_MINUTES) || 3) * 60 * 1000;
const DAILY_XP_CAP = Number(process.env.DAILY_XP_CAP) || 50;
const MAX_RECENT_MESSAGES = Number(process.env.FINGERPRINT_MEMORY) || 50;
const MAX_RECENT_TEXTS = Number(process.env.SIMILAR_TEXT_MEMORY) || 30;
const MIN_TEXT_LENGTH = 5;
const GLOBAL_IMAGE_DEDUP = envBool("GLOBAL_IMAGE_DEDUP", true);
const GLOBAL_TEXT_DEDUP = envBool("GLOBAL_TEXT_DEDUP", true);
const GLOBAL_CROSS_SIMILARITY = envBool("GLOBAL_CROSS_SIMILARITY", true);

const xpQueues = new Map();

function fingerprintStore() {
  return getBackend().fingerprints;
}

function logStore() {
  return getBackend().logs;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCleanContent(message) {
  return message.content
    .replace(/<@!?(\d+)>/g, "")
    .replace(/<@&(\d+)>/g, "")
    .replace(/<#(\d+)>/g, "")
    .trim();
}

function normalizeMessage(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function hasImage(message) {
  return message.attachments.some((file) => {
    const type = file.contentType ?? "";
    return type.startsWith("image/");
  });
}

function getTextFingerprint(message) {
  const text = normalizeMessage(getCleanContent(message));

  if (!text) {
    return "";
  }

  return `text:${text}`;
}

function getLegacyFingerprint(message) {
  const textFp = getTextFingerprint(message);

  if (textFp) {
    return textFp;
  }

  const attachmentIds = [...message.attachments.values()]
    .map((file) => file.id)
    .sort()
    .join(",");

  if (attachmentIds) {
    return `file:${attachmentIds}`;
  }

  return "";
}

async function buildContentFingerprints(message) {
  const fingerprints = [];
  const textFp = getTextFingerprint(message);

  if (textFp) {
    fingerprints.push({ kind: "text", key: textFp });
  }

  const imageHashes = await hashMessageImages(message);

  for (const hash of imageHashes) {
    fingerprints.push({ kind: "image", key: `image:${hash}` });
  }

  if (fingerprints.length === 0) {
    const legacy = getLegacyFingerprint(message);

    if (legacy) {
      fingerprints.push({ kind: "legacy", key: legacy });
    }
  }

  return fingerprints;
}

function getEarnedToday(userData) {
  const today = getTodayKey();
  return userData?.dailyXpDate === today ? (userData.dailyXpEarned ?? 0) : 0;
}

function getDailyRemaining(userData, author = null) {
  const cap = author ? getEffectiveDailyCap(author) : DAILY_XP_CAP;
  return Math.max(0, cap - getEarnedToday(userData));
}

function checkVelocity(userId, author = null) {
  const limit = author ? getEffectiveVelocityCap(author) : Number(process.env.VELOCITY_XP_PER_HOUR || 35);
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const earned = logStore().sumSince(userId, since);

  if (earned >= limit) {
    return {
      ok: false,
      reason: `Chống farm: đã nhận ${earned} XP trong 1 giờ (giới hạn ${limit}).`
    };
  }

  return { ok: true, earnedLastHour: earned };
}

function isDuplicateInMemory(userData, fingerprint) {
  return (userData?.recentMessages ?? []).includes(fingerprint);
}

function checkPersistentDuplicate(userId, fingerprint, kind) {
  const store = fingerprintStore();

  if (store.hasForUser(userId, fingerprint)) {
    return {
      duplicate: true,
      reason: "Chống spam: nội dung/ảnh này đã được tính XP trước đó."
    };
  }

  if (!store.hasGlobal(fingerprint)) {
    return { duplicate: false };
  }

  const owner = store.getOwner(fingerprint);

  if (!owner || owner === userId) {
    return { duplicate: false };
  }

  const imageDup = kind === "image" && GLOBAL_IMAGE_DEDUP;
  const textDup = (kind === "text" || kind === "legacy") && GLOBAL_TEXT_DEDUP;

  if (!imageDup && !textDup) {
    return { duplicate: false };
  }

  const strike = recordAltStrike(userId, owner, kind);
  log.warn("Cross-account duplicate", {
    userId,
    owner,
    kind,
    strikeCount: strike.count,
    blocked: strike.blocked
  });

  if (kind === "image") {
    return {
      duplicate: true,
      reason:
        "Chống gian lận: ảnh này đã được tài khoản khác dùng để nhận XP (nghi alt)."
    };
  }

  return {
    duplicate: true,
    reason:
      "Chống gian lận: nội dung này đã được tài khoản khác dùng để nhận XP (nghi alt)."
  };
}

async function checkAntiSpam(message, userData, xpAmount = 10, options = {}) {
  const userId = options.userId ?? message.author.id;
  const author = message.author;
  const threadId = options.threadId ?? message.channel?.id;
  const cleanText = getCleanContent(message);
  const normalized = normalizeMessage(cleanText);
  const legacyFingerprint = getLegacyFingerprint(message);

  if (isAltBlocked(userId)) {
    return { ok: false, reason: getAltBlockReason() };
  }

  if (!legacyFingerprint) {
    return { ok: false, reason: "Tin nhắn rỗng (không tính mention)." };
  }

  if (!hasImage(message) && normalized.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      reason: `Nội dung thật quá ngắn (cần ≥ ${MIN_TEXT_LENGTH} ký tự, không tính @tag).`
    };
  }

  if (!hasImage(message) && normalized.length >= MIN_TEXT_LENGTH) {
    const quality = analyzeContentQuality(normalized);

    if (!quality.ok) {
      return quality;
    }
  }

  const velocity = checkVelocity(userId, author);

  if (!velocity.ok) {
    log.warn("Velocity cap", { userId, earned: velocity.earnedLastHour });
    return velocity;
  }

  const now = Date.now();
  const lastXpAt = userData?.lastXpAt ?? 0;

  if (lastXpAt && now - lastXpAt < COOLDOWN_MS) {
    const waitMinutes = Math.ceil((COOLDOWN_MS - (now - lastXpAt)) / 60_000);
    return {
      ok: false,
      reason: `Chống spam: chờ ${waitMinutes} phút nữa mới cộng XP.`
    };
  }

  if (threadId) {
    const lastThreadXp = userData?.lastXpByThread?.[threadId] ?? 0;

    if (lastThreadXp && now - lastThreadXp < THREAD_COOLDOWN_MS) {
      const waitMinutes = Math.ceil(
        (THREAD_COOLDOWN_MS - (now - lastThreadXp)) / 60_000
      );
      return {
        ok: false,
        reason: `Chống spam: chờ ${waitMinutes} phút nữa mới cộng XP trong thread này.`
      };
    }
  }

  const effectiveCap = getEffectiveDailyCap(author);
  const remaining = getDailyRemaining(userData, author);

  if (remaining <= 0) {
    const capNote = isNewAccount(author)
      ? ` (acc mới: cap ${effectiveCap}/ngày)`
      : "";
    return {
      ok: false,
      reason: `Chống spam: giới hạn ${effectiveCap} XP/ngày${capNote} (đã nhận ${getEarnedToday(userData)}).`
    };
  }

  if (xpAmount > remaining) {
    return {
      ok: false,
      reason: `Chống spam: chỉ còn ${remaining} XP hôm nay (cap ${effectiveCap}).`
    };
  }

  if (normalized.length >= 15) {
    const similar = findSimilarText(normalized, userData?.recentTexts ?? []);

    if (similar) {
      return {
        ok: false,
        reason: "Chống spam: nội dung quá giống feedback bạn đã gửi trước đó."
      };
    }

    if (GLOBAL_CROSS_SIMILARITY) {
      const globalSimilar = checkGlobalSimilarity(userId, normalized);

      if (!globalSimilar.ok) {
        recordAltStrike(userId, "global-similarity", "text");
        log.warn("Global similar text", { userId });
        return globalSimilar;
      }
    }
  }

  if (isDuplicateInMemory(userData, legacyFingerprint)) {
    return {
      ok: false,
      reason: "Chống spam: nội dung/ảnh này đã được tính XP trước đó."
    };
  }

  const fingerprints = await buildContentFingerprints(message);

  for (const entry of fingerprints) {
    if (isDuplicateInMemory(userData, entry.key)) {
      return {
        ok: false,
        reason: "Chống spam: nội dung/ảnh này đã được tính XP trước đó."
      };
    }

    const persistent = checkPersistentDuplicate(userId, entry.key, entry.kind);

    if (persistent.duplicate) {
      if (isAltBlocked(userId)) {
        return { ok: false, reason: getAltBlockReason() };
      }

      return { ok: false, reason: persistent.reason };
    }
  }

  return {
    ok: true,
    fingerprint: legacyFingerprint,
    fingerprints,
    normalized
  };
}

function recordFingerprints(userId, fingerprints = []) {
  const store = fingerprintStore();

  for (const entry of fingerprints) {
    store.record(userId, entry.key, entry.kind);
  }
}

function buildAntiSpamRecord(
  userId,
  { fingerprint, fingerprints = [], normalized = "", userData, xpAmount = 10, threadId }
) {
  const today = getTodayKey();
  const earnedToday = getEarnedToday(userData);
  const keys = [
    fingerprint,
    ...fingerprints.map((entry) => entry.key)
  ].filter(Boolean);
  const recentMessages = [...new Set([...keys, ...(userData?.recentMessages ?? [])])].slice(
    0,
    MAX_RECENT_MESSAGES
  );
  const recentTexts =
    normalized.length >= 15
      ? [...new Set([normalized, ...(userData?.recentTexts ?? [])])].slice(
          0,
          MAX_RECENT_TEXTS
        )
      : userData?.recentTexts ?? [];
  const lastXpByThread = { ...(userData?.lastXpByThread ?? {}) };

  if (threadId) {
    lastXpByThread[threadId] = Date.now();
  }

  recordFingerprints(userId, fingerprints);
  recordGlobalSample(userId, normalized);

  return {
    lastXpAt: Date.now(),
    recentMessages,
    recentTexts,
    lastXpByThread,
    dailyXpDate: today,
    dailyXpEarned: earnedToday + xpAmount
  };
}

function allocateDailyXp(userData, parts, author = null) {
  let remaining = getDailyRemaining(userData, author);
  const granted = {};

  for (const part of parts) {
    if (!part.amount || part.amount <= 0 || remaining <= 0) {
      continue;
    }

    const give = Math.min(part.amount, remaining);
    granted[part.key] = give;
    remaining -= give;
  }

  return granted;
}

async function runWithXpLock(userId, task) {
  const current = xpQueues.get(userId) ?? Promise.resolve();
  const next = current.then(task);
  xpQueues.set(userId, next);

  try {
    return await next;
  } finally {
    if (xpQueues.get(userId) === next) {
      xpQueues.delete(userId);
    }
  }
}

function pruneFingerprints() {
  const days = Number(process.env.FINGERPRINT_RETENTION_DAYS || 90);
  return fingerprintStore().prune(days);
}

module.exports = {
  checkAntiSpam,
  buildAntiSpamRecord,
  recordFingerprints,
  getCleanContent,
  hasImage,
  runWithXpLock,
  getEarnedToday,
  getDailyRemaining,
  allocateDailyXp,
  pruneFingerprints,
  COOLDOWN_MS,
  THREAD_COOLDOWN_MS,
  DAILY_XP_CAP,
  MAX_RECENT_MESSAGES,
  MIN_TEXT_LENGTH,
  GLOBAL_IMAGE_DEDUP,
  GLOBAL_TEXT_DEDUP
};
