const { SlashCommandBuilder } = require("discord.js");
const { buildHelpMessage } = require("../help");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Hướng dẫn sử dụng bot Feedback XP"),

  async execute(interaction) {
    await interaction.reply({
      content: buildHelpMessage(),
      ephemeral: true
    });
  }
};
