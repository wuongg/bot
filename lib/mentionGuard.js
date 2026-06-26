const BOT_CHIU = "Bot chịu 🙏";

const MAX_INPUT_CHARS = Number(process.env.MENTION_MAX_INPUT || 300);
const COOLDOWN_MS = Number(process.env.MENTION_AI_COOLDOWN_MS || 10_000);

const lastAiCallByUser = new Map();

const BLOCKED_INPUT_PATTERNS = [
  /\b(source\s*code|github|gitlab|repo(sitory)?)\b/i,
  /\b(api\s*key|secret|password|credential|\.env|token)\b/i,
  /\b(TOKEN|OPENROUTER_API_KEY|ADMIN_USER_IDS|DATABASE_URL)\s*=/i,
  /\bsk-[a-z0-9_-]{8,}\b/i,
  /\b(jailbreak|ignore\s+(all\s+)?(previous\s+)?instructions?|dan\s+mode|bypass)\b/i,
  /\b(system\s+prompt|hidden\s+prompt)\b/i,
  /\b(sql\s*injection|ddos|malware)\b/i,
  /\b(viết\s+code|viet code|cho\s+code|show\s+code|mã\s+nguồn|source\s+bot|generate\s+code)\b/i,
  /```/,
  /discord\.gg\/\w+/i,
  /https?:\/\//i
];

const BLOCKED_OUTPUT_PATTERNS = [
  /```/,
  /\bsk-[a-z0-9_-]{8,}\b/i,
  /\b(TOKEN|OPENROUTER_API_KEY|ADMIN_USER_IDS|DATABASE_URL|password)\s*=/i,
  /\b(api\s*key|secret\s*key|bearer\s+[a-z0-9._-]{20,})\b/i,
  /https?:\/\//i,
  /discord\.gg\/\w+/i,
  /\b(function|const\s+\w+\s*=|import\s+|require\s*\(|class\s+\w+|def\s+\w+\s*\()/i
];

function normalizeInput(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text.replace(/\0/g, "").trim().slice(0, MAX_INPUT_CHARS);
}

function getInputBlockReason(text) {
  const normalized = normalizeInput(text);

  if (!normalized && text && text.trim()) {
    return "input_too_long_after_normalize";
  }

  for (const pattern of BLOCKED_INPUT_PATTERNS) {
    if (pattern.test(normalized)) {
      return "blocked_keyword";
    }
  }

  return null;
}

function isBlockedInput(text) {
  return getInputBlockReason(text) !== null;
}

function checkRateLimit(userId) {
  const now = Date.now();
  const last = lastAiCallByUser.get(userId) ?? 0;

  if (now - last < COOLDOWN_MS) {
    return { ok: false, waitMs: COOLDOWN_MS - (now - last) };
  }

  lastAiCallByUser.set(userId, now);
  return { ok: true };
}

function isSafeOutput(reply) {
  if (typeof reply !== "string") {
    return false;
  }

  const trimmed = reply.trim();

  if (!trimmed || trimmed.length > 220) {
    return false;
  }

  for (const pattern of BLOCKED_OUTPUT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  const mentionCount = (trimmed.match(/@\w/g) || []).length;

  if (mentionCount > 2) {
    return false;
  }

  return true;
}

function sanitizeOutput(reply) {
  if (!isSafeOutput(reply)) {
    return null;
  }

  return reply.trim().slice(0, 220);
}

module.exports = {
  BOT_CHIU,
  MAX_INPUT_CHARS,
  COOLDOWN_MS,
  normalizeInput,
  isBlockedInput,
  getInputBlockReason,
  checkRateLimit,
  isSafeOutput,
  sanitizeOutput
};
