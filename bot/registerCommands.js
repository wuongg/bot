const { REST, Routes } = require("discord.js");
const path = require("path");
const log = require("../lib/logger");

async function registerSlashCommands(client, commandFiles) {
  const commands = commandFiles.map((file) =>
    require(path.join(__dirname, "..", "commands", file)).data.toJSON()
  );

  const rest = new REST().setToken(process.env.TOKEN);

  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commands }
      );
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
      log.info("Slash commands registered (guild)");
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      log.info("Slash commands registered (global)");
    }
  } catch (error) {
    log.error("Không đăng ký được slash command", { message: error.message });

    if (error.code === 50001) {
      log.error("Missing Access — kiểm tra GUILD_ID và quyền applications.commands", {
        invite: `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=268504064&scope=bot%20applications.commands`
      });
    }
  }
}

module.exports = { registerSlashCommands };
