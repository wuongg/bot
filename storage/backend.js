const path = require("path");
const { dataDir } = require("../dataPath");

function getStorageMode() {
  if (process.env.DATABASE_URL?.trim()) {
    return "postgres";
  }

  if (
    process.env.STORAGE === "sqlite" ||
    process.env.DATABASE_PATH?.trim() ||
    process.env.SQLITE_PATH?.trim()
  ) {
    return "sqlite";
  }

  return "json";
}

function getSqlitePath() {
  const configured =
    process.env.DATABASE_PATH?.trim() ||
    process.env.SQLITE_PATH?.trim() ||
    path.join(dataDir, "bot.db");

  return path.resolve(configured);
}

let backend = null;

function getBackend() {
  if (!backend) {
    throw new Error("Storage chưa init — gọi initStorage() trước.");
  }

  return backend;
}

function initStorage() {
  const mode = getStorageMode();

  if (backend) {
    return { mode, reused: true };
  }

  if (mode === "postgres") {
    const log = require("../lib/logger");
    log.warn(
      "DATABASE_URL được set nhưng Postgres chưa hỗ trợ đầy đủ — dùng SQLite",
      { path: getSqlitePath() }
    );
    backend = require("./sqlite");
    backend.init(getSqlitePath());
    return { mode: "sqlite", reused: false, fallbackFrom: "postgres" };
  }

  if (mode === "sqlite") {
    backend = require("./sqlite");
    backend.init(getSqlitePath());
  } else {
    backend = require("./jsonBackend");
    backend.init();
  }

  return { mode, reused: false };
}

module.exports = {
  getStorageMode,
  getSqlitePath,
  initStorage,
  getBackend
};
