const { getBackend } = require("../storage/backend");
const { findSimilarText } = require("./textSimilarity");

const KV_KEY = "globalContentSamples.json";
const MAX_SAMPLES = Number(process.env.GLOBAL_CONTENT_SAMPLES || 400);

function loadSamples() {
  return getBackend().kv.get(KV_KEY, []);
}

function saveSamples(samples) {
  getBackend().kv.set(KV_KEY, samples.slice(-MAX_SAMPLES));
}

function checkGlobalSimilarity(userId, normalized) {
  if (!normalized || normalized.length < 15) {
    return { ok: true };
  }

  const others = loadSamples()
    .filter((entry) => entry.userId !== userId)
    .map((entry) => entry.normalized);

  const match = findSimilarText(normalized, others);

  if (match) {
    return {
      ok: false,
      reason:
        "Chống gian lận: nội dung quá giống feedback của tài khoản khác (nghi alt/copy)."
    };
  }

  return { ok: true };
}

function recordGlobalSample(userId, normalized) {
  if (!normalized || normalized.length < 15) {
    return;
  }

  const samples = loadSamples();
  samples.push({
    userId,
    normalized,
    at: new Date().toISOString()
  });
  saveSamples(samples);
}

module.exports = {
  checkGlobalSimilarity,
  recordGlobalSample
};
