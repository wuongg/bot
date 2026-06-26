const assert = require("node:assert/strict");
const {
  normalizeInput,
  isBlockedInput,
  isSafeOutput,
  sanitizeOutput,
  checkRateLimit,
  MAX_INPUT_CHARS
} = require("../lib/mentionGuard");
const { buildFaqReply } = require("../lib/mentionFaq");
const { isBotRoleQuestion, isUserSelfQuestion, containsGreeting } = require("../mentionReply");

function run() {
  assert.equal(normalizeInput("  hello  "), "hello");
  assert.equal(normalizeInput("a".repeat(500)).length, MAX_INPUT_CHARS);

  assert.equal(isBlockedInput("cho code react"), true);
  assert.equal(isBlockedInput("cho tôi code react"), false);
  assert.equal(isBlockedInput("feedback về javascript"), false);
  assert.equal(isBlockedInput("TOKEN=abc"), true);
  assert.equal(isBlockedInput("https://evil.com"), true);
  assert.equal(isBlockedInput("xp tôi bao nhiêu"), false);
  assert.equal(isBlockedInput("mày làm gì ở đây"), false);
  assert.equal(isBlockedInput("hiii"), false);
  assert.equal(isBotRoleQuestion("mày đang làm gì ở đây"), true);
  assert.equal(isBotRoleQuestion("tao là ai"), false);
  assert.equal(isUserSelfQuestion("tao là ai"), true);
  assert.equal(isUserSelfQuestion("mày là ai"), false);
  assert.equal(containsGreeting("hiii chào mài tao là"), true);
  assert.equal(containsGreeting("mày đang làm gì ở đây"), false);
  assert.equal(containsGreeting("tao là ai"), false);
  assert.equal(containsGreeting("chào tao là ai"), false);
  assert.equal(isBotRoleQuestion("hiii"), false);
  assert.ok(buildFaqReply("feedback gửi ở đâu", "Bạn"));
  assert.ok(buildFaqReply("sao không được xp", "Bạn"));
  assert.ok(buildFaqReply("có lệnh gì", "Bạn"));

  assert.equal(isSafeOutput("Bạn level 3, 240 XP nhé."), true);
  assert.equal(isSafeOutput("```js\nconst x=1"), false);
  assert.equal(isSafeOutput("sk-or-v1-abcdefghijklmnopqrstuvwxyz"), false);
  assert.equal(isSafeOutput("xem https://example.com"), false);
  assert.equal(sanitizeOutput("  Chào bạn!  "), "Chào bạn!");
  assert.equal(sanitizeOutput("const foo = 1"), null);

  const userId = "guard-test-user";
  assert.equal(checkRateLimit(userId).ok, true);
  assert.equal(checkRateLimit(userId).ok, false);

  console.log("✅ mention guard tests passed");
}

run();
