const { EmbedBuilder } = require("discord.js");
const { buildXpReply } = require("./xpMessages");

function buildFeedbackReply(result) {
  const lines = [buildXpReply(result.granted.base ?? 0)];

  if (result.capNote) {
    lines.push(result.capNote);
  }

  const totalGranted = result.totalGranted ?? result.granted.base ?? 0;

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`+${totalGranted} XP`)
    .setDescription(lines.join("\n\n"));

  return { embeds: [embed] };
}

module.exports = { buildFeedbackReply };
