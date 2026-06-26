const { cleanupExpiredTempTitles } = require("./xp");
const { pruneFingerprints } = require("./antispam");

const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS || 3_600_000);

function startScheduler(client) {
  const tick = async () => {
    cleanupExpiredTempTitles();
    const removed = pruneFingerprints();

    if (removed > 0) {
      console.log(`🧹 Đã xóa ${removed} fingerprint cũ`);
    }
  };

  tick();
  const timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();

  console.log(`⏱️  Scheduler chạy mỗi ${Math.round(INTERVAL_MS / 60_000)} phút`);
}

module.exports = { startScheduler };
