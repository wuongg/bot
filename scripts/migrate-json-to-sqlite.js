require("dotenv").config();

process.env.STORAGE = "sqlite";
process.env.DATABASE_PATH =
  process.env.DATABASE_PATH || process.env.MIGRATE_SQLITE_PATH || "./data/bot.db";

const fs = require("fs");
const path = require("path");
const { initStorage, getSqlitePath } = require("../storage/backend");
const { readJson } = require("../storage/jsonFile");
const { dataDir } = require("../dataPath");

const { mode } = initStorage();
const backend = require("../storage/sqlite");

console.log(`Migrating JSON → SQLite (${mode}) at ${getSqlitePath()}`);

const xpData = readJson("xpData.json", {});

for (const [discordId, user] of Object.entries(xpData)) {
  const { xp = 0, level = 0, ...meta } = user;
  backend.users.withWrite(discordId, (record) => {
    Object.assign(record, { xp, level, ...meta });
  });
}

console.log(`✅ Users: ${Object.keys(xpData).length}`);

const picks = readJson("pickedNumbers.json", { byUser: {}, byNumber: {} });

for (const [discordId, userPicks] of Object.entries(picks.byUser ?? {})) {
  for (const pick of userPicks) {
    try {
      backend.picks.pickNumber(discordId, pick.number, pick.level);
    } catch {
      // skip duplicates
    }
  }
}

console.log(`✅ Picks migrated`);

const duels = readJson("duels.json", { active: [], history: [] });

for (const duel of duels.active ?? []) {
  backend.duels.insert(duel);
}

for (const duel of duels.history ?? []) {
  backend.duels.insert({
    ...duel,
    startAt: duel.startAt,
    endAt: duel.endAt ?? duel.startAt
  });
  if (duel.result) {
    backend.duels.resolve(duel.id, duel.result, duel.resolvedAt ?? Date.now());
  }
}

console.log(`✅ Duels migrated`);

for (const file of [
  "luckyNumber.json",
  "bingo.json",
  "xpLogs.json"
]) {
  const source = path.join(dataDir, file);

  if (fs.existsSync(source)) {
    const value = JSON.parse(fs.readFileSync(source, "utf8"));
    backend.kv.set(file, value);
    console.log(`✅ KV: ${file}`);
  }
}

console.log("Migration hoàn tất.");
