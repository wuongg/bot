const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { getLevel } = require("../xpLevel");

let db = null;

function init(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
}

function parseUser(row) {
  if (!row) {
    return null;
  }

  const meta = JSON.parse(row.meta || "{}");
  return {
    xp: row.xp,
    level: row.level,
    ...meta
  };
}

function saveUserRow(discordId, user) {
  const { xp = 0, level = 0, ...meta } = user;
  db.prepare(
    `INSERT INTO users (discord_id, xp, level, meta)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET
       xp = excluded.xp,
       level = excluded.level,
       meta = excluded.meta`
  ).run(discordId, xp, level, JSON.stringify(meta));
}

const users = {
  get(discordId) {
    const row = db
      .prepare("SELECT discord_id, xp, level, meta FROM users WHERE discord_id = ?")
      .get(discordId);
    return parseUser(row);
  },

  withWrite(discordId, updater) {
    return db.transaction(() => {
      let user = users.get(discordId) ?? { xp: 0, level: 0 };
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
    })();
  },

  getLeaderboard(limit = 10) {
    return db
      .prepare(
        `SELECT discord_id, xp, level, meta FROM users
         WHERE xp > 0 ORDER BY xp DESC LIMIT ?`
      )
      .all(limit)
      .map((row) => ({ userId: row.discord_id, ...parseUser(row) }));
  },

  getAll() {
    return db
      .prepare("SELECT discord_id, xp, level, meta FROM users WHERE xp > 0")
      .all()
      .map((row) => ({ userId: row.discord_id, ...parseUser(row) }));
  },

  delete(discordId) {
    db.prepare("DELETE FROM users WHERE discord_id = ?").run(discordId);
  },

  cleanupTempTitles() {
    const rows = db.prepare("SELECT discord_id, meta FROM users").all();
    let changed = 0;
    const update = db.prepare(
      "UPDATE users SET meta = ? WHERE discord_id = ?"
    );

    for (const row of rows) {
      const meta = JSON.parse(row.meta || "{}");

      if (meta.tempTitle?.expiresAt <= Date.now()) {
        delete meta.tempTitle;
        update.run(JSON.stringify(meta), row.discord_id);
        changed += 1;
      }
    }

    return changed;
  }
};

const picks = {
  getUserNumbers(discordId) {
    return db
      .prepare(
        "SELECT level, number FROM picks WHERE discord_id = ? ORDER BY level"
      )
      .all(discordId);
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
    const row = db
      .prepare("SELECT discord_id FROM picks WHERE number = ?")
      .get(number);
    return row?.discord_id ?? null;
  },

  getAllData() {
    const rows = db.prepare("SELECT discord_id, level, number FROM picks").all();
    const byUser = {};
    const byNumber = {};

    for (const row of rows) {
      byUser[row.discord_id] ??= [];
      byUser[row.discord_id].push({ level: row.level, number: row.number });
      byNumber[String(row.number)] = row.discord_id;
    }

    return { byUser, byNumber };
  },

  pickNumber(discordId, number, currentLevel) {
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

    const owner = picks.getUserIdForNumber(number);

    if (owner && owner !== discordId) {
      return { ok: false, reason: `Số **${number}** đã được người khác chọn.` };
    }

    const userRows = picks.getUserNumbers(discordId);

    if (userRows.some((pick) => pick.number === number)) {
      return {
        ok: false,
        reason: `Bạn đã chọn số **${number}** ở level trước — hãy chọn số khác.`
      };
    }

    db.prepare(
      "INSERT INTO picks (discord_id, level, number) VALUES (?, ?, ?)"
    ).run(discordId, targetLevel, number);

    return { ok: true, level: targetLevel, number };
  }
};

const duels = {
  _rowToDuel(row) {
    return {
      id: row.id,
      challengerId: row.challenger_id,
      opponentId: row.opponent_id,
      startAt: row.start_at,
      endAt: row.end_at,
      xp: JSON.parse(row.xp_json || "{}"),
      resolvedAt: row.resolved_at ?? undefined,
      result: row.result ?? undefined
    };
  },

  getActive(userId) {
    const row = db
      .prepare(
        `SELECT * FROM duels
         WHERE resolved = 0 AND (challenger_id = ? OR opponent_id = ?)
         LIMIT 1`
      )
      .get(userId, userId);
    return row ? duels._rowToDuel(row) : null;
  },

  getActiveAll() {
    return db
      .prepare("SELECT * FROM duels WHERE resolved = 0")
      .all()
      .map((row) => duels._rowToDuel(row));
  },

  insert(duel) {
    db.prepare(
      `INSERT INTO duels (id, challenger_id, opponent_id, start_at, end_at, xp_json, resolved)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).run(
      duel.id,
      duel.challengerId,
      duel.opponentId,
      duel.startAt,
      duel.endAt,
      JSON.stringify(duel.xp)
    );
  },

  updateXp(duelId, xpJson) {
    db.prepare("UPDATE duels SET xp_json = ? WHERE id = ?").run(
      JSON.stringify(xpJson),
      duelId
    );
  },

  resolve(duelId, result, resolvedAt) {
    db.prepare(
      "UPDATE duels SET resolved = 1, result = ?, resolved_at = ? WHERE id = ?"
    ).run(result, resolvedAt, duelId);
  },

  trimHistory(keep = 30) {
    const rows = db
      .prepare(
        "SELECT id FROM duels WHERE resolved = 1 ORDER BY resolved_at DESC"
      )
      .all();

    if (rows.length <= keep) {
      return;
    }

    const remove = rows.slice(keep).map((row) => row.id);
    const stmt = db.prepare("DELETE FROM duels WHERE id = ?");

    for (const id of remove) {
      stmt.run(id);
    }
  }
};

const kv = {
  get(key, fallback = null) {
    const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key);
    return row ? JSON.parse(row.value) : fallback;
  },

  set(key, value) {
    db.prepare(
      `INSERT INTO kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, JSON.stringify(value));
  }
};

const logs = {
  append(entry) {
    const max = Number(process.env.XP_LOG_MAX_ENTRIES || 2000);
    db.prepare(
      `INSERT INTO xp_logs
       (discord_id, amount, level, streak, granted, leveled_up, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.userId,
      entry.amount,
      entry.level ?? null,
      entry.streak ?? null,
      JSON.stringify(entry.granted ?? {}),
      entry.leveledUp ? 1 : 0,
      entry.source ?? "feedback",
      new Date().toISOString()
    );

    const count = db.prepare("SELECT COUNT(*) AS c FROM xp_logs").get().c;

    if (count > max) {
      db.prepare(
        `DELETE FROM xp_logs WHERE id IN (
          SELECT id FROM xp_logs ORDER BY id ASC LIMIT ?
        )`
      ).run(count - max);
    }
  },

  getForUser(userId, limit = 20) {
    return db
      .prepare(
        `SELECT amount, level, streak, granted, leveled_up, source, created_at
         FROM xp_logs WHERE discord_id = ?
         ORDER BY id DESC LIMIT ?`
      )
      .all(userId, limit)
      .map((row) => ({
        userId,
        amount: row.amount,
        level: row.level,
        streak: row.streak,
        granted: JSON.parse(row.granted || "{}"),
        leveledUp: row.leveled_up === 1,
        source: row.source,
        at: row.created_at
      }));
  },

  sumSince(userId, sinceIso) {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM xp_logs
         WHERE discord_id = ? AND created_at >= ?`
      )
      .get(userId, sinceIso);
    return row?.total ?? 0;
  }
};

const fingerprints = {
  hasForUser(userId, fingerprint) {
    const row = db
      .prepare(
        `SELECT 1 FROM content_fingerprints
         WHERE fingerprint = ? AND discord_id = ?
         LIMIT 1`
      )
      .get(fingerprint, userId);
    return Boolean(row);
  },

  hasGlobal(fingerprint) {
    const row = db
      .prepare("SELECT 1 FROM content_fingerprints WHERE fingerprint = ? LIMIT 1")
      .get(fingerprint);
    return Boolean(row);
  },

  getOwner(fingerprint) {
    const row = db
      .prepare("SELECT discord_id FROM content_fingerprints WHERE fingerprint = ?")
      .get(fingerprint);
    return row?.discord_id ?? null;
  },

  record(userId, fingerprint, kind) {
    db.prepare(
      `INSERT INTO content_fingerprints (fingerprint, discord_id, kind, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(fingerprint) DO NOTHING`
    ).run(fingerprint, userId, kind, new Date().toISOString());
  },

  prune(retentionDays = 90) {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
    const result = db
      .prepare("DELETE FROM content_fingerprints WHERE created_at < ?")
      .run(cutoff);
    return result.changes ?? 0;
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
