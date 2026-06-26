const { getBackend } = require("../storage/backend");

const KV_KEY = "altStrikes.json";
const STRIKE_LIMIT = Number(process.env.ALT_STRIKE_LIMIT || 3);
const STRIKE_WINDOW_MS = Number(process.env.ALT_STRIKE_WINDOW_HOURS || 24) * 3_600_000;
const STRIKE_BLOCK_MS = Number(process.env.ALT_STRIKE_BLOCK_HOURS || 24) * 3_600_000;

function loadStrikes() {
  return getBackend().kv.get(KV_KEY, {});
}

function saveStrikes(data) {
  getBackend().kv.set(KV_KEY, data);
}

function getStrikeState(userId) {
  const data = loadStrikes();
  const state = data[userId];

  if (!state) {
    return { count: 0, blockedUntil: 0 };
  }

  const now = Date.now();

  if (state.windowStart && now - state.windowStart > STRIKE_WINDOW_MS) {
    return { count: 0, blockedUntil: state.blockedUntil ?? 0 };
  }

  return {
    count: state.count ?? 0,
    blockedUntil: state.blockedUntil ?? 0
  };
}

function isAltBlocked(userId) {
  const state = getStrikeState(userId);
  return state.blockedUntil > Date.now();
}

function recordAltStrike(userId, otherUserId, kind) {
  const data = loadStrikes();
  const now = Date.now();
  const current = data[userId] ?? { count: 0, windowStart: now, blockedUntil: 0 };

  if (!current.windowStart || now - current.windowStart > STRIKE_WINDOW_MS) {
    current.count = 0;
    current.windowStart = now;
  }

  current.count += 1;
  current.lastKind = kind;
  current.lastOtherUserId = otherUserId;

  if (current.count >= STRIKE_LIMIT) {
    current.blockedUntil = now + STRIKE_BLOCK_MS;
    current.count = 0;
    current.windowStart = now;
  }

  data[userId] = current;
  saveStrikes(data);

  return {
    count: current.count,
    blockedUntil: current.blockedUntil,
    blocked: current.blockedUntil > now
  };
}

function getAltBlockReason() {
  const hours = Math.round(STRIKE_BLOCK_MS / 3_600_000);
  return `Chống gian lận: tài khoản bị tạm khóa XP ${hours}h do copy ảnh/nội dung từ acc khác nhiều lần.`;
}

module.exports = {
  isAltBlocked,
  recordAltStrike,
  getAltBlockReason,
  STRIKE_LIMIT
};
