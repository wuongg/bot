const { dataDir } = require("../dataPath");
const { registerSlashCommands } = require("../bot/registerCommands");
const { startScheduler } = require("../scheduler");
const { getStorageMode, getSqlitePath } = require("../storage/backend");
const {
  ensureLevelRoles,
  syncAllMemberLevelRoles,
  logLevelRoleConfig
} = require("../roles");
const {
  feedbackChannelIds,
  isFeedbackParentChannel,
  registerFeedbackChannel,
  joinFeedbackThreads
} = require("../feedback");
const log = require("../lib/logger");
const { verifyOpenRouterConnection } = require("../lib/mentionAi");

async function handleReady(client, commandFiles) {
  log.info("Bot online", { tag: client.user.tag });

  await verifyOpenRouterConnection();

  await registerSlashCommands(client, commandFiles);
  log.info("Data directory", { path: dataDir, storage: getStorageMode() });

  if (getStorageMode() === "sqlite") {
    log.info("SQLite database", { path: getSqlitePath() });
  }

  if (!process.env.GUILD_ID) {
    startScheduler(client);
    return;
  }

  const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);

  if (!guild) {
    log.warn("Không fetch được guild", { guildId: process.env.GUILD_ID });
    startScheduler(client);
    return;
  }

  const channels = await guild.channels.fetch();

  for (const channel of channels.values()) {
    if (isFeedbackParentChannel(channel)) {
      registerFeedbackChannel(channel);
    }
  }

  if (feedbackChannelIds.size === 0) {
    log.warn("Không tìm thấy kênh feedback");
    for (const channel of channels.values()) {
      if (channel.name) {
        log.info("Channel in guild", { name: channel.name, id: channel.id });
      }
    }
  }

  await joinFeedbackThreads(client);
  log.info("Feedback channels tracked", { count: feedbackChannelIds.size });

  await ensureLevelRoles(guild);
  await syncAllMemberLevelRoles(guild);
  logLevelRoleConfig();

  startScheduler(client);
}

module.exports = { handleReady };
