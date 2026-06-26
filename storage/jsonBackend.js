const fs = require("fs");
const { getDataFile } = require("../dataPath");
const { readJson, writeJson } = require("./jsonFile");
const { getLevel } = require("../xpLevel");

const xpFile = getDataFile("xpData.json");
const picksFile = getDataFile("pickedNumbers.json");
const duelsFile = getDataFile("duels.json");

let xpData = {};
let pickData = { byUser: {}, byNumber: {} };
let duelData = { active: [], history: [] };

function loadXpData() {
  if (!fs.existsSync(xpFile)) {
    return;
  }

  try {
    xpData = JSON.parse(fs.readFileSync(xpFile, "utf8"));
  } catch {
    xpData = {};
  }
}

function saveXpData() {
  const tmp = `${xpFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(xpData, null, 2));
  fs.renameSync(tmp, xpFile);
}

function loadPickData() {
  try {
    pickData = readJson("pickedNumbers.json", { byUser: {}, byNumber: {} });
  } catch {
    pickData = { byUser: {}, byNumber: {} };
  }
}

function savePickData() {
  writeJson("pickedNumbers.json", pickData);
}

function loadDuelData() {
  try {
    duelData = readJson("duels.json", { active: [], history: [] });
  } catch {
    duelData = { active: [], history: [] };
  }
}

function saveDuelData() {
  writeJson("duels.json", duelData);
}

function init() {
  loadXpData();
  loadPickData();
  loadDuelData();
}

function parseUser(user) {
  return user ?? null;
}

function saveUserRow(discordId, user) {
  xpData[discordId] = user;
  saveXpData();
}

const users = {
  get(discordId) {
    loadXpData();
    return parseUser(xpData[discordId] ?? null);
  },

  withWrite(discordId, updater) {
    loadXpData();

    if (!xpData[discordId]) {
      xpData[discordId] = { xp: 0, level: 0 };
    }

    const user = xpData[discordId];
    const previousLevel = user.level ?? getLevel(user.xp ?? 0);
    const xpBefore = user.xp ?? 0;
    const result = updater(user) ?? {};

    if (result.ok === false) {
      return result;
    }

    user.level = getLevel(user.xp ?? 0);
    saveUserRow(discordId, user);

    return {
      ...result,
      user: { ...user },
      xpBefore,
      xpAfter: user.xp,
      leveledUp: user.level > previousLevel,
      previousLevel
    };
  },

  getLeaderboard(limit = 10) {
    loadXpData();
    return Object.entries(xpData)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  },

  getAll() {
    loadXpData();
    return Object.entries(xpData).map(([userId, data]) => ({
      userId,
      ...data
    }));
  },

  delete(discordId) {
    loadXpData();
    delete xpData[discordId];
    saveXpData();
  },

  cleanupTempTitles() {
    loadXpData();
    let changed = 0;

    for (const user of Object.values(xpData)) {
      if (user.tempTitle?.expiresAt <= Date.now()) {
        delete user.tempTitle;
        changed += 1;
      }
    }

    if (changed) {
      saveXpData();
    }

    return changed;
  }
};

const picks = {
  getUserNumbers(discordId) {
    loadPickData();
    return [...(pickData.byUser[discordId] ?? [])].sort(
      (a, b) => a.level - b.level
    );
  },

  getNextPickLevel(discordId, currentLevel) {
    const rows = picks.getUserNumbers(discordId);
    const picked = new Set(rows.map((row) => row.level));

    for (let level = 1; level <= currentLevel; level++) {
      if (!picked.has(level)) {
        return level;
      }
    }

    return null;
  },

  getUserIdForNumber(number) {
    loadPickData();
    return pickData.byNumber[String(number)] ?? null;
  },

  getAllData() {
    loadPickData();
    return {
      byUser: { ...pickData.byUser },
      byNumber: { ...pickData.byNumber }
    };
  },

  pickNumber(discordId, number, currentLevel) {
    loadPickData();

    if (!currentLevel || currentLevel < 1) {
      return { ok: false, reason: "Bạn chưa có level nào để chọn số." };
    }

    if (number < 0 || number > 999 || !Number.isInteger(number)) {
      return { ok: false, reason: "Số phải từ 0 đến 999." };
    }

    const targetLevel = picks.getNextPickLevel(discordId, currentLevel);

    if (!targetLevel) {
      return {
        ok: false,
        reason: "Bạn đã chọn đủ số cho tất cả level hiện tại."
      };
    }

    const numberKey = String(number);
    const userPicks = pickData.byUser[discordId] ?? [];

    if (pickData.byNumber[numberKey] && pickData.byNumber[numberKey] !== discordId) {
      return { ok: false, reason: `Số **${number}** đã được người khác chọn.` };
    }

    if (userPicks.some((pick) => pick.number === number)) {
      return {
        ok: false,
        reason: `Bạn đã chọn số **${number}** ở level trước — hãy chọn số khác.`
      };
    }

    userPicks.push({ level: targetLevel, number });
    pickData.byUser[discordId] = userPicks;
    pickData.byNumber[numberKey] = discordId;
    savePickData();

    return { ok: true, level: targetLevel, number };
  }
};

const duels = {
  getActive(userId) {
    loadDuelData();
    return (
      duelData.active.find(
        (duel) => duel.challengerId === userId || duel.opponentId === userId
      ) ?? null
    );
  },

  getActiveAll() {
    loadDuelData();
    return [...duelData.active];
  },

  insert(duel) {
    loadDuelData();
    duelData.active.push(duel);
    saveDuelData();
  },

  updateXp(duelId, xpJson) {
    loadDuelData();
    const duel = duelData.active.find((entry) => entry.id === duelId);

    if (duel) {
      duel.xp = xpJson;
      saveDuelData();
    }
  },

  resolve(duelId, result, resolvedAt) {
    loadDuelData();
    const index = duelData.active.findIndex((entry) => entry.id === duelId);

    if (index === -1) {
      return;
    }

    const [duel] = duelData.active.splice(index, 1);
    duelData.history.push({ ...duel, resolvedAt, result });
    saveDuelData();
  },

  trimHistory(keep = 30) {
    loadDuelData();

    if (duelData.history.length > keep) {
      duelData.history = duelData.history.slice(-keep);
      saveDuelData();
    }
  }
};

const kv = {
  get(key, fallback = null) {
    return readJson(key, fallback);
  },

  set(key, value) {
    writeJson(key, value);
  }
};

const logs = {
  append(entry) {
    const logsData = readJson("xpLogs.json", []);
    logsData.push({ ...entry, at: new Date().toISOString() });
    const max = Number(process.env.XP_LOG_MAX_ENTRIES || 2000);

    if (logsData.length > max) {
      logsData.splice(0, logsData.length - max);
    }

    writeJson("xpLogs.json", logsData);
  },

  getForUser(userId, limit = 20) {
    const logsData = readJson("xpLogs.json", []);
    return logsData.filter((row) => row.userId === userId).slice(-limit).reverse();
  },

  sumSince(userId, sinceIso) {
    const logsData = readJson("xpLogs.json", []);
    const since = new Date(sinceIso).getTime();

    return logsData
      .filter((row) => row.userId === userId && new Date(row.at).getTime() >= since)
      .reduce((sum, row) => sum + (row.amount ?? 0), 0);
  }
};

const FINGERPRINTS_KV = "contentFingerprints.json";

function loadFingerprints() {
  return readJson(FINGERPRINTS_KV, {});
}

function saveFingerprints(data) {
  writeJson(FINGERPRINTS_KV, data);
}

const fingerprints = {
  hasForUser(userId, fingerprint) {
    const data = loadFingerprints();
    return data[fingerprint]?.discordId === userId;
  },

  hasGlobal(fingerprint) {
    return Boolean(loadFingerprints()[fingerprint]);
  },

  getOwner(fingerprint) {
    return loadFingerprints()[fingerprint]?.discordId ?? null;
  },

  record(userId, fingerprint, kind) {
    const data = loadFingerprints();

    if (!data[fingerprint]) {
      data[fingerprint] = {
        discordId: userId,
        kind,
        createdAt: new Date().toISOString()
      };
      saveFingerprints(data);
    }
  },

  prune(retentionDays = 90) {
    const data = loadFingerprints();
    const cutoff = Date.now() - retentionDays * 86_400_000;
    let removed = 0;

    for (const [key, entry] of Object.entries(data)) {
      if (new Date(entry.createdAt).getTime() < cutoff) {
        delete data[key];
        removed += 1;
      }
    }

    if (removed > 0) {
      saveFingerprints(data);
    }

    return removed;
  }
};

module.exports = {
  init,
  users,
  picks,
  duels,
  kv,
  logs,
  fingerprints
};
