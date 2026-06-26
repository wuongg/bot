const { SlashCommandBuilder } = require("discord.js");
const { buildProfileEmbed } = require("../profile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stalk")
    .setDescription("Xem avatar, level, XP và số đã chọn của ai đó")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Người cần stalk (bỏ trống = stalk bản thân)")
        .setRequired(false)
    ),

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

    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild?.members
      .fetch(target.id)
      .catch(() => null);
    const embed = buildProfileEmbed(target, member);

    await interaction.editReply({ embeds: [embed] });
  }
};
