#!/usr/bin/env node
/**
 * Cộng XP thủ công (bù feedback bị miss).
 * Usage: node scripts/grant-xp.js <discord_user_id> [amount]
 */
require("dotenv").config();

const { initStorage } = require("../storage/backend");
const { grantBonusXp, getUserXp, resetUser } = require("../xp");
const { appendXpLog } = require("../storage/xpLog");
const { syncMemberLevelRole } = require("../roles");
const { Client, GatewayIntentBits } = require("discord.js");

async function findUserIdByName(query) {
  const guildId = process.env.GUILD_ID?.trim();
  const token = process.env.TOKEN?.trim();

  if (!guildId || !token) {
    return null;
  }

  const url = `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=5`;
  const response = await fetch(url, {
    headers: { Authorization: `Bot ${token}` }
  });

  if (!response.ok) {
    console.error("Discord search failed:", response.status, await response.text());
    return null;
  }

  const members = await response.json();
  const match = members.find((member) =>
    member.user.username.toLowerCase().includes(query.toLowerCase())
  );

  return match?.user?.id ?? members[0]?.user?.id ?? null;
}

async function main() {
  initStorage();

  let userId = process.argv[2];
  const amount = Number(process.argv[3] || 10);
  const shouldReset = process.argv.includes("--reset");

  if (!userId || !/^\d{17,20}$/.test(userId)) {
    const query = userId || "hoaingocnguyen";
    console.log(`Tìm user: ${query}...`);
    userId = await findUserIdByName(query);

    if (!userId) {
      console.error("Không tìm thấy user. Dùng: node scripts/grant-xp.js <discord_id> [amount]");
      process.exit(1);
    }

    console.log(`Tìm thấy ID: ${userId}`);
  }

  if (shouldReset) {
    resetUser(userId);
    console.log(`Đã reset XP user ${userId}`);
  }

  const before = getUserXp(userId);
  const result = grantBonusXp(userId, amount);

  appendXpLog({
    userId,
    amount,
    level: getUserXp(userId)?.level,
    granted: { manual: amount },
    leveledUp: result.leveledUp,
    source: "admin_manual"
  });

  const after = getUserXp(userId);

  console.log(
    `✅ +${amount} XP → ${after?.xp ?? 0} XP (Lv.${after?.level ?? 0})` +
      (before ? ` | trước: ${before.xp} XP` : " | user mới")
  );

  if (result.leveledUp) {
    console.log(`🎉 Level up: ${result.previousLevel} → ${after.level}`);
  }

  const token = process.env.TOKEN?.trim();
  const guildId = process.env.GUILD_ID?.trim();

  if (token && guildId) {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });

    await client.login(token);
    const guild = await client.guilds.fetch(guildId).catch(() => null);

    if (guild) {
      await syncMemberLevelRole(guild, userId, after?.level ?? 0);
      console.log("✅ Đã sync role Discord");
    }

    await client.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
