const { MessageFlags } = require("discord.js");
const { handlePickButton, handlePickModal } = require("../numberPickUi");
const log = require("../lib/logger");

const handledInteractions = new Set();

function registerInteractionCreate(client) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith("picknum:")) {
      try {
        await handlePickButton(interaction);
      } catch (error) {
        log.error("pick button error", { message: error.message });
      }
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("pickmod:")) {
      try {
        await handlePickModal(interaction);
      } catch (error) {
        log.error("pick modal error", { message: error.message });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (handledInteractions.has(interaction.id)) {
      return;
    }

    handledInteractions.add(interaction.id);
    setTimeout(() => handledInteractions.delete(interaction.id), 60_000);

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        content: "Lệnh không tồn tại.",
        ephemeral: true
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      log.error("Command error", {
        command: interaction.commandName,
        message: error.message
      });

      if (error.code === 10062 || error.code === 40060) {
        return;
      }

      if (interaction.replied || interaction.deferred) {
        return;
      }

      try {
        await interaction.reply({
          content: "Có lỗi khi chạy lệnh.",
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        log.error("Command reply error", { message: replyError.message });
      }
    }
  });
}

module.exports = { registerInteractionCreate };
