const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { getUserXp } = require("./xp");
const { pickNumber, getNextPickLevel, formatUserNumbers } = require("./numbers");
const { getDisplayTitle } = require("./titles");
const { getLevelDefinition } = require("./roles");

function buildPickButton(userId, pickLevel) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`picknum:${userId}:${pickLevel}`)
      .setLabel(`Chọn số Level ${pickLevel}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔢")
  );
}

function buildLevelUpMessage(userId, newLevel) {
  const pickLevel = getNextPickLevel(userId, newLevel);
  const levelDef = getLevelDefinition(newLevel);
  const title = getDisplayTitle(userId, newLevel);

  const embed = new EmbedBuilder()
    .setColor(levelDef.color)
    .setTitle("🎉 LEVEL UP!")
    .setDescription(`<@${userId}> vừa lên **Level ${newLevel}**!`)
    .addFields(
      { name: "🏷️ Danh hiệu", value: title, inline: true },
      { name: "🎨 Màu tên", value: levelDef.label, inline: true }
    );

  if (!pickLevel) {
    return { embeds: [embed], components: [] };
  }

  embed.addFields({
    name: "🔢 Chọn số",
    value: `Bấm nút bên dưới để chọn số **0–999** cho Level ${pickLevel}.`,
    inline: false
  });

  return {
    embeds: [embed],
    components: [buildPickButton(userId, pickLevel)]
  };
}

async function handlePickButton(interaction) {
  const [, userId, pickLevelStr] = interaction.customId.split(":");
  const pickLevel = Number(pickLevelStr);

  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: "Đây không phải lượt chọn số của bạn.",
      ephemeral: true
    });
  }

  const user = getUserXp(userId);

  if (!user || user.level < pickLevel) {
    return interaction.reply({
      content: "Bạn chưa đủ level để chọn số này.",
      ephemeral: true
    });
  }

  const nextLevel = getNextPickLevel(userId, user.level);

  if (nextLevel !== pickLevel) {
    return interaction.reply({
      content: `Bạn cần chọn số cho **Level ${nextLevel}** trước.`,
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`pickmod:${userId}:${pickLevel}`)
    .setTitle(`Chọn số Level ${pickLevel}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("number_input")
          .setLabel("Nhập số từ 0 đến 999")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(3)
          .setRequired(true)
          .setPlaceholder("VD: 42")
      )
    );

  await interaction.showModal(modal);
}

async function handlePickModal(interaction) {
  const [, userId, pickLevelStr] = interaction.customId.split(":");
  const pickLevel = Number(pickLevelStr);

  if (interaction.user.id !== userId) {
    return interaction.reply({
      content: "Đây không phải lượt chọn số của bạn.",
      ephemeral: true
    });
  }

  const raw = interaction.fields.getTextInputValue("number_input").trim();
  const number = Number(raw);

  if (!Number.isInteger(number) || raw.includes(".") || raw.includes(",")) {
    return interaction.reply({
      content: "Số không hợp lệ. Hãy nhập số nguyên từ 0 đến 999.",
      ephemeral: true
    });
  }

  const user = getUserXp(userId);
  const result = pickNumber(userId, number, user?.level ?? 0);

  if (!result.ok) {
    return interaction.reply({
      content: result.reason,
      ephemeral: true
    });
  }

  const nextLevel = getNextPickLevel(userId, user.level);
  let content =
    `✅ Đã chọn số **${result.number}** cho **Level ${result.level}**!\n\n` +
    formatUserNumbers(userId);

  const components = [];

  if (nextLevel) {
    content += `\n\nBấm nút để chọn số cho **Level ${nextLevel}**:`;
    components.push(buildPickButton(userId, nextLevel));
  }

  await interaction.reply({
    content,
    components,
    ephemeral: true
  });
}

module.exports = {
  buildLevelUpMessage,
  handlePickButton,
  handlePickModal
};
