const fs = require("fs");
const path = require("path");
const { dataDir } = require("../dataPath");

const BACKUP_DIR = path.join(dataDir, "backups");

function backupData() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(targetDir, { recursive: true });

  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.endsWith(".json") || file.endsWith(".db"));

  for (const file of files) {
    fs.copyFileSync(path.join(dataDir, file), path.join(targetDir, file));
  }

  console.log(`✅ Backup xong: ${targetDir} (${files.length} files)`);
}

backupData();
