const XP_MESSAGES = [
  "+{xp} XP — valid, không cap 🧢",
  "+{xp} XP — feedback này ăn được 👌",
  "+{xp} XP — dev đọc là mê 📖",
  "+{xp} XP — chất lượng cao, không phải dạng vừa 💅",
  "+{xp} XP — góp ý xịn, respect 📸",
  "+{xp} XP — based feedback 🔥",
  "+{xp} XP — W rizz cho team 🫡",
  "+{xp} XP — không phải feedback cho có đâu ✨"
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function buildXpReply(xp) {
  return formatTemplate(pickRandom(XP_MESSAGES), { xp });
}

module.exports = { buildXpReply };
