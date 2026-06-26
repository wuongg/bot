const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "levelRoles.json");
const MAX_LEVEL = 5;

const LEVEL_DEFINITIONS = [
  { level: 1, name: "Level 1", color: 0x95a5a6, label: "Xám" },
  { level: 2, name: "Level 2", color: 0x2ecc71, label: "Xanh lá" },
  { level: 3, name: "Level 3", color: 0x3498db, label: "Xanh dương" },
  { level: 4, name: "Level 4", color: 0x9b59b6, label: "Tím" },
  { level: 5, name: "Level 5", color: 0xf39c12, label: "Cam vàng" }
];

function loadLevelRoles() {
  try {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch {
    return {};
  }
}

function saveLevelRoles(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function getConfiguredLevelRoles() {
  const config = loadLevelRoles();

  return Object.entries(config)
    .filter(([, roleId]) => roleId && String(roleId).trim())
    .map(([level, roleId]) => ({
      level: Number(level),
      roleId: String(roleId).trim()
    }))
    .filter((entry) => !Number.isNaN(entry.level))
    .sort((a, b) => a.level - b.level);
}

async function ensureLevelRoles(guild) {
  if (!guild) {
    return;
  }

  const config = loadLevelRoles();
  let changed = false;

  for (const def of LEVEL_DEFINITIONS) {
    const key = String(def.level);
    let role = config[key] ? guild.roles.cache.get(config[key]) : null;

    if (!role) {
      role = guild.roles.cache.find((r) => r.name === def.name);
    }

    if (!role) {
      role = await guild.roles
        .create({
          name: def.name,
          colors: { primaryColor: def.color },
          reason: "FeedbackXP — role theo level",
          hoist: true,
          mentionable: false
        })
        .catch((error) => {
          console.error(`Không tạo được ${def.name}:`, error.message);
          return null;
        });
    } else if (role.colors?.primaryColor !== def.color) {
      await role.setColors({ primaryColor: def.color }).catch(() => {});
    }

    if (role && config[key] !== role.id) {
      config[key] = role.id;
      changed = true;
      console.log(`✅ ${def.name} (${def.label}) → ${role.id}`);
    }
  }

  if (changed) {
    saveLevelRoles(config);
  }

  const botRole = guild.members.me?.roles.highest;
  if (botRole) {
    for (const def of LEVEL_DEFINITIONS) {
      const roleId = config[String(def.level)];
      const role = roleId ? guild.roles.cache.get(roleId) : null;

      if (role && role.position >= botRole.position) {
        await role
          .setPosition(botRole.position - 1)
          .catch(() => {});
      }
    }
  }
}

async function syncMemberLevelRole(guild, userId, level) {
  if (!guild || !level || level < 1) {
    return;
  }

  const roleLevel = Math.min(level, MAX_LEVEL);
  const entries = getConfiguredLevelRoles();

  if (entries.length === 0) {
    return;
  }

  const target = entries.find((entry) => entry.level === roleLevel);
  if (!target) {
    return;
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return;
  }

  const allRoleIds = entries.map((entry) => entry.roleId);

  for (const roleId of allRoleIds) {
    if (roleId !== target.roleId && member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId).catch(() => {});
    }
  }

  if (!member.roles.cache.has(target.roleId)) {
    await member.roles.add(target.roleId).catch((error) => {
      console.error(`Không gán được role Level ${roleLevel}:`, error.message);
    });
  }
}

function logLevelRoleConfig() {
  const entries = getConfiguredLevelRoles();

  if (entries.length === 0) {
    console.log("Chưa có role level — bot sẽ tự tạo khi khởi động.");
    return;
  }

  for (const def of LEVEL_DEFINITIONS) {
    const entry = entries.find((e) => e.level === def.level);
    if (entry) {
      console.log(`Level ${def.level} (${def.label}): ${entry.roleId}`);
    }
  }
}

async function syncAllMemberLevelRoles(guild) {
  const { getAllUsersWithXp } = require("./xp");
  const users = getAllUsersWithXp();

  for (const user of users) {
    await syncMemberLevelRole(guild, user.userId, user.level);
  }

  if (users.length > 0) {
    console.log(`Đã đồng bộ role level cho ${users.length} thành viên.`);
  }
}

function getLevelDefinition(level) {
  const safeLevel = Math.min(Math.max(level ?? 1, 1), MAX_LEVEL);
  return LEVEL_DEFINITIONS.find((def) => def.level === safeLevel) ?? LEVEL_DEFINITIONS[0];
}

module.exports = {
  MAX_LEVEL,
  LEVEL_DEFINITIONS,
  getLevelDefinition,
  ensureLevelRoles,
  syncMemberLevelRole,
  syncAllMemberLevelRoles,
  logLevelRoleConfig,
  getConfiguredLevelRoles
};
