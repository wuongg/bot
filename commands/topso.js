const { SlashCommandBuilder } = require("discord.js");
const { getNumbersData } = require("../numbers");
const { buildTopSoText } = require("../topso");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("topso")
    .setDescription("Xem top số hot và số hiếm"),

  async execute(interaction) {
    await interaction.deferReply();
    const content = await buildTopSoText(interaction.guild, getNumbersData());
    await interaction.editReply({ content });
  }
};
