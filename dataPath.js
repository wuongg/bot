const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;

function applyHostedVolumeDefaults() {
  const mount =
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    process.env.RENDER_DISK_MOUNT_PATH?.trim();

  if (!mount) {
    return;
  }

  process.env.DATA_DIR = mount;

  if (!process.env.DATABASE_PATH?.trim()) {
    process.env.DATABASE_PATH = path.join(mount, "bot.db");
  }

  if (!process.env.STORAGE?.trim()) {
    process.env.STORAGE = "sqlite";
  }

  const label = process.env.RAILWAY_VOLUME_MOUNT_PATH ? "Railway" : "Render";
  console.log(`📦 ${label} volume → DATA_DIR=${mount}`);
}

applyHostedVolumeDefaults();

if (!process.env.DATA_DIR?.trim()) {
  process.env.DATA_DIR = "./data";
}

const dataDir = path.resolve(process.env.DATA_DIR);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const MIGRATABLE_FILES = [
  "xpData.json",
  "pickedNumbers.json",
  "luckyNumber.json",
  "duels.json",
  "bingo.json"
];

function migrateRootDataFiles() {
  for (const filename of MIGRATABLE_FILES) {
    const rootPath = path.join(ROOT_DIR, filename);
    const targetPath = path.join(dataDir, filename);

    if (!fs.existsSync(rootPath)) {
      continue;
    }

    const rootStat = fs.statSync(rootPath);

    if (rootStat.size <= 2) {
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(rootPath, targetPath);
      console.log(`📦 Đã migrate ${filename} → ${dataDir}`);
      continue;
    }

    const targetStat = fs.statSync(targetPath);

    if (rootStat.mtimeMs > targetStat.mtimeMs) {
      fs.copyFileSync(rootPath, targetPath);
      console.log(`📦 Đã cập nhật ${filename} từ bản root (mới hơn)`);
    }
  }
}

migrateRootDataFiles();

function getDataFile(filename) {
  return path.join(dataDir, filename);
}

module.exports = { dataDir, getDataFile, migrateRootDataFiles };
