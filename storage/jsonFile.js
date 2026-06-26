const fs = require("fs");
const { getDataFile } = require("../dataPath");

function readJson(filename, fallback) {
  const file = getDataFile(filename);

  if (!fs.existsSync(file)) {
    return fallback;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const raw = fs.readFileSync(file, "utf8");

      if (!raw.trim()) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      if (attempt >= 4) {
        throw error;
      }
    }
  }

  return fallback;
}

function writeJson(filename, data) {
  const file = getDataFile(filename);
  const tmpFile = `${file}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, file);
}

function updateJson(filename, fallback, updater) {
  const current = readJson(filename, fallback);
  const next = updater(structuredClone
    ? structuredClone(current)
    : JSON.parse(JSON.stringify(current)));
  writeJson(filename, next);
  return next;
}

module.exports = { readJson, writeJson, updateJson };
