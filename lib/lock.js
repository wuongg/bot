const fs = require("fs");
const path = require("path");

const lockFile = path.join(__dirname, "..", ".bot.lock");

function acquireLock() {
  if (fs.existsSync(lockFile)) {
    const pid = Number(fs.readFileSync(lockFile, "utf8"));

    if (!Number.isNaN(pid)) {
      try {
        process.kill(pid, 0);
        console.error(`Bot đã chạy ở process ${pid}. Chỉ được chạy 1 instance.`);
        process.exit(1);
      } catch {
        fs.unlinkSync(lockFile);
      }
    }
  }

  fs.writeFileSync(lockFile, String(process.pid));
}

function releaseLock() {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

function setupLockHandlers() {
  acquireLock();
  process.on("exit", releaseLock);
  process.on("SIGINT", () => {
    releaseLock();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    releaseLock();
    process.exit(0);
  });
}

module.exports = { setupLockHandlers, releaseLock };
