const { SlashCommandBuilder } = require("discord.js");
const { getLeaderboard } = require("../xp");
const { getLevelTitle, getDisplayTitle } = require("../titles");

const medals = ["🥇", "🥈", "🥉"];

async function buildLeaderboardText(guild, limit = 10) {
  const top = getLeaderboard(limit);

  if (top.length === 0) {
    return "Chưa có ai có XP.";
  }

  const lines = await Promise.all(
    top.map(async (entry, index) => {
      const prefix = medals[index] ?? `${index + 1}.`;
      const member = await guild?.members.fetch(entry.userId).catch(() => null);
      const name =
        member?.displayName ?? member?.user.username ?? `<@${entry.userId}>`;
      const title = getDisplayTitle(entry.userId, entry.level);
      return `${prefix} **${name}** — Lv.${entry.level} · ${entry.xp} XP\n   _${title}_`;
    })
  );

  return `🏆 **Bảng xếp hạng XP**\n\n${lines.join("\n\n")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Xem bảng xếp hạng XP"),

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }
    } catch (error) {
      if (error.code === 40060 || error.code === 10062) {
        return;
      }

      throw error;
    }

    const content = await buildLeaderboardText(interaction.guild);
    await interaction.editReply({ content });
  },

  buildLeaderboardText
};
