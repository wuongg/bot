const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { isAdmin } = require("../lib/admin");
const { resetUser, setUserXp, getUserXp } = require("../xp");
const { syncMemberLevelRole } = require("../roles");
const { getUserLogs } = require("../storage/xpLog");
const { buildProfileEmbed } = require("../profile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Quản trị bot (chỉ admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Xóa toàn bộ XP của user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User cần reset").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("xp")
        .setDescription("Đặt XP cho user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User").setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Số XP mới")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(9999)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("logs")
        .setDescription("Xem lịch sử XP gần đây của user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Xem profile admin của user")
        .addUserOption((option) =>
          option.setName("user").setDescription("User").setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: "Bạn không có quyền dùng lệnh admin. Thêm ID vào `ADMIN_USER_IDS` trong `.env`.",
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser("user", true);

    if (sub === "reset") {
      resetUser(target.id);

      if (interaction.guild) {
        await syncMemberLevelRole(interaction.guild, target.id, 0);
      }

      return interaction.reply({
        content: `✅ Đã reset XP của **${target.username}**.`,
        ephemeral: true
      });
    }

    if (sub === "xp") {
      const amount = interaction.options.getInteger("amount", true);
      const result = setUserXp(target.id, amount);

      if (interaction.guild) {
        await syncMemberLevelRole(interaction.guild, target.id, result.level);
      }

      return interaction.reply({
        content: `✅ Đã set **${target.username}** → **${result.xp} XP** (Lv.${result.level}).`,
        ephemeral: true
      });
    }

    if (sub === "logs") {
      const logs = getUserLogs(target.id, 15);

      if (logs.length === 0) {
        return interaction.reply({
          content: `Chưa có log XP cho **${target.username}**.`,
          ephemeral: true
        });
      }

      const lines = logs.map(
        (entry) =>
          `• \`${entry.at}\` **+${entry.amount}** XP → Lv.${entry.level} _(${entry.source})_`
      );

      return interaction.reply({
        content: `📜 **Log XP — ${target.username}**\n${lines.join("\n")}`,
        ephemeral: true
      });
    }

    if (sub === "view") {
      const member = await interaction.guild?.members
        .fetch(target.id)
        .catch(() => null);
      const embed = buildProfileEmbed(target, member);
      const user = getUserXp(target.id);

      return interaction.reply({
        content: user
          ? `Admin view — **${target.username}**`
          : `**${target.username}** chưa có XP.`,
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};
