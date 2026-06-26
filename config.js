const REQUIRED = ["TOKEN"];

function validateConfig() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error(`Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (!process.env.GUILD_ID?.trim()) {
    console.warn("⚠️  GUILD_ID chưa set — slash command sẽ đăng ký global (chậm hơn).");
  }

  if (!process.env.DATA_DIR?.trim()) {
    process.env.DATA_DIR = "./data";
    console.warn("⚠️  DATA_DIR chưa set — dùng mặc định ./data");
  }

  if (!process.env.ADMIN_USER_IDS?.trim()) {
    console.warn("⚠️  ADMIN_USER_IDS chưa set — /admin sẽ không ai dùng được.");
  }

  const mode =
    process.env.DATABASE_URL?.trim()
      ? "postgres→sqlite (fallback)"
      : process.env.STORAGE === "sqlite" || process.env.DATABASE_PATH?.trim()
        ? "sqlite"
        : "json";

  if (mode === "json") {
    console.warn(
      "ℹ️  Storage: JSON — set STORAGE=sqlite và DATABASE_PATH=./data/bot.db để dùng SQLite."
    );
  }

  if (
    (process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
      process.env.RENDER_DISK_MOUNT_PATH?.trim()) &&
    mode !== "sqlite"
  ) {
    console.warn(
      "⚠️  Persistent disk đã mount nhưng STORAGE chưa là sqlite — set STORAGE=sqlite."
    );
  }

  if (process.env.RENDER === "true" && mode === "json") {
    console.warn(
      "⚠️  Render: set STORAGE=sqlite và mount disk tại /app/data (xem render.yaml)."
    );
  }

  if (process.env.MENTION_AI === "true" && !process.env.OPENROUTER_API_KEY?.trim()) {
    console.warn(
      "⚠️  MENTION_AI=true nhưng thiếu OPENROUTER_API_KEY — @bot dùng rule thường."
    );
  }

  if (process.env.RENDER !== "true") {
    console.warn(
      "⚠️  Nếu bot cũng chạy trên Render: tắt npm start local — tránh trùng phản hồi."
    );
  }
}

module.exports = { validateConfig };
