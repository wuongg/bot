const { EmbedBuilder } = require("discord.js");
const { getUserXp } = require("./xp");
const { getUserNumbers } = require("./numbers");
const { getLevelDefinition } = require("./roles");

function buildProfileEmbed(targetUser, guildMember) {
  const user = getUserXp(targetUser.id);
  const displayName = guildMember?.displayName ?? targetUser.username;
  const level = user?.level ?? 0;
  const xp = user?.xp ?? 0;
  const levelDef = getLevelDefinition(Math.max(level, 1));
  const picks = getUserNumbers(targetUser.id);
  const numbersText =
    picks.length > 0
      ? picks.map((pick) => `Lv.${pick.level} → **${pick.number}**`).join("\n")
      : "_Chưa chọn_";

  return new EmbedBuilder()
    .setColor(level > 0 ? levelDef.color : 0x95a5a6)
    .setTitle(`👤 ${displayName}`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: "⭐ Level", value: `**${level}**`, inline: true },
      { name: "📈 XP", value: `**${xp}**`, inline: true },
      { name: "🔢 Số đã chọn", value: numbersText, inline: false }
    );
}

module.exports = { buildProfileEmbed };
