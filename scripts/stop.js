const fs = require("fs");
const path = require("path");

const lockFile = path.join(__dirname, "..", ".bot.lock");

if (!fs.existsSync(lockFile)) {
  process.exit(0);
}

const pid = Number(fs.readFileSync(lockFile, "utf8"));

if (!Number.isNaN(pid)) {
  try {
    process.kill(pid);
    console.log(`Đã dừng bot (PID ${pid}).`);
  } catch {
    console.log("Bot cũ không còn chạy.");
  }
}

fs.unlinkSync(lockFile);
