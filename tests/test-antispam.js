require("dotenv").config();

process.env.STORAGE = "json";
const { initStorage } = require("../storage/backend");
initStorage();

const assert = require("node:assert/strict");
const {
  getDailyRemaining,
  allocateDailyXp,
  checkAntiSpam,
  buildAntiSpamRecord,
  DAILY_XP_CAP
} = require("../antispam");
const { findSimilarText } = require("../lib/textSimilarity");

function mockMessage(content, attachmentIds = [], channelId = "thread-1", userId = "user-1") {
  return {
    author: {
      id: userId,
      createdAt: new Date(Date.now() - 30 * 86_400_000)
    },
    channel: { id: channelId },
    content,
    attachments: {
      some: (fn) => attachmentIds.some((id) => fn({ id, contentType: "image/png" })),
      values: () =>
        attachmentIds.map((id) => ({
          id,
          contentType: "image/png",
          url: `https://example.com/${id}.png`
        }))
    }
  };
}

async function run() {
  const userId = `test-${Date.now()}`;
  const unique = `batch ${Date.now()}`;

  const userData = {
    dailyXpDate: new Date().toISOString().slice(0, 10),
    dailyXpEarned: 45
  };

  assert.equal(getDailyRemaining(userData), 5);

  const granted = allocateDailyXp(userData, [
    { key: "base", amount: 10 },
    { key: "streak", amount: 5 }
  ]);

  assert.equal(granted.base, 5);
  assert.equal(granted.streak, undefined);

  const spam = await checkAntiSpam(
    mockMessage(`hello world test ${unique}`, [], "thread-1", userId),
    null,
    10
  );
  assert.equal(spam.ok, true);

  const short = await checkAntiSpam(mockMessage("hi", [], "thread-1", userId), null, 10);
  assert.equal(short.ok, false);

  const similar = findSimilarText(
    "feedback ve loi dang nhap khong hoat dong tot",
    ["feedback ve loi dang nhap khong hoat dong tot nua"]
  );
  assert.ok(similar);

  const feedbackText = `mot feedback rat chi tiet ve loi san pham ${unique}`;
  const first = await checkAntiSpam(
    mockMessage(feedbackText, [], "thread-1", userId),
    null,
    10
  );
  assert.equal(first.ok, true);

  const record = buildAntiSpamRecord(userId, {
    fingerprint: first.fingerprint,
    fingerprints: first.fingerprints,
    normalized: first.normalized,
    userData: {},
    xpAmount: 10,
    threadId: "thread-1"
  });

  const duplicate = await checkAntiSpam(
    mockMessage(feedbackText, [], "thread-1", userId),
    record,
    10,
    { userId, threadId: "thread-1" }
  );
  assert.equal(duplicate.ok, false);

  const threadCooldown = await checkAntiSpam(
    mockMessage(`feedback khac trong thread ${unique}`, [], "thread-1", userId),
    {
      ...record,
      lastXpAt: Date.now() - 6 * 60_000,
      lastXpByThread: { "thread-1": Date.now() }
    },
    10,
    { userId, threadId: "thread-1" }
  );
  assert.equal(threadCooldown.ok, false);
  assert.match(threadCooldown.reason, /thread này/);

  const gibberish = await checkAntiSpam(
    mockMessage("aaaaaaa aaaaaaa aaaaaaa aaaaa", [], "thread-2", `${userId}-gib`),
    null,
    10
  );
  assert.equal(gibberish.ok, false);

  console.log("✅ antispam tests passed", { DAILY_XP_CAP });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
