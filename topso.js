function getAllPicksFlat(byUser) {
  const picks = [];

  for (const [userId, userPicks] of Object.entries(byUser)) {
    for (const pick of userPicks) {
      picks.push({ userId, level: pick.level, number: pick.number });
    }
  }

  return picks;
}

function buildTopSoStats(byUser, byNumber) {
  const picks = getAllPicksFlat(byUser);

  if (picks.length === 0) {
    return null;
  }

  const numberCounts = {};

  for (const pick of picks) {
    const key = String(pick.number);
    numberCounts[key] = (numberCounts[key] ?? 0) + 1;
  }

  const rareEntries = Object.entries(numberCounts)
    .filter(([, count]) => count === 1)
    .map(([num]) => Number(num))
    .sort((a, b) => a - b);

  const popular = Object.entries(numberCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([num, count]) => ({ number: Number(num), count }));

  return {
    totalPicks: picks.length,
    rareNumbers: rareEntries.slice(0, 10),
    popular,
    byNumber
  };
}

async function buildTopSoText(guild, numbersData) {
  const stats = buildTopSoStats(numbersData.byUser, numbersData.byNumber);

  if (!stats) {
    return "Chưa ai chọn số — lên level rồi pick số đi!";
  }

  const lines = [];

  lines.push("🔢 **Top số**");
  lines.push(`Tổng số đã chọn: **${stats.totalPicks}**`);
  lines.push("");

  if (stats.popular.length > 0) {
    lines.push("**🔥 Số được chọn nhiều nhất**");
    for (const entry of stats.popular) {
      const owners = Object.entries(numbersData.byNumber)
        .filter(([num]) => Number(num) === entry.number)
        .map(([, userId]) => userId);
      const names = await Promise.all(
        owners.map(async (userId) => {
          const member = await guild?.members.fetch(userId).catch(() => null);
          return member?.displayName ?? `<@${userId}>`;
        })
      );
      lines.push(`• **${entry.number}** — ${entry.count} lần (${names.join(", ")})`);
    }
    lines.push("");
  }

  if (stats.rareNumbers.length > 0) {
    lines.push("**💎 Số hiếm (chỉ 1 người chọn)**");
    lines.push(
      stats.rareNumbers
        .map((num) => {
          const userId = numbersData.byNumber[String(num)];
          return `• **${num}** — <@${userId}>`;
        })
        .join("\n")
    );
  }

  return lines.join("\n");
}

module.exports = { buildTopSoText, buildTopSoStats };
