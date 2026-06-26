const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

function loadCommands() {
  const commands = new Collection();
  const commandsPath = path.join(__dirname, "..", "commands");
  const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    commands.set(command.data.name, command);
  }

  return { commands, files };
}

module.exports = { loadCommands };
