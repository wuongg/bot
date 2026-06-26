const COOLDOWN_ROASTS = [
  "⏳ Chill {minutes} phút nữa rồi feedback tiếp — bot không ăn spam đâu 🫠",
  "⏳ {minutes} phút nữa nhé — spam XP là không bền vững đâu 🧢",
  "⏳ Hít thở đi, còn {minutes} phút cooldown. Quality > quantity ✨",
  "⏳ Slow down bestie — {minutes} phút nữa mới cộng XP 🔥"
];

const DUPLICATE_ROASTS = [
  "🔄 Copy-paste feedback cũ à? Nội dung này đã được tính XP rồi 💀",
  "🔄 Déjà vu — tin này bot đã thấy rồi, gửi cái mới đi 👀",
  "🔄 Trùng nội dung rồi — đổi góc nhìn hoặc chi tiết hơn nha ✍️",
  "🔄 Ảnh/nội dung recycle — bot có bộ nhớ dài hơn bạn nghĩ 🧠"
];

const SIMILAR_ROASTS = [
  "📝 Feedback này giống bản cũ quá — thêm chi tiết mới đi ✍️",
  "📝 Same vibe, same text — đổi wording hoặc ví dụ khác nhé 👀"
];

const VELOCITY_ROASTS = [
  "🚨 Farm XP quá nhanh — nghỉ {minutes} phút rồi quay lại chill 🧊",
  "🚨 Velocity check failed — bạn đang XP speedrun à? Giảm tốc đi 🏎️"
];

const IMAGE_ROASTS = [
  "🖼️ Ảnh này đã được dùng nhận XP rồi — upload ảnh mới hoặc mô tả khác 📸"
];

const ALT_ROASTS = [
  "🕵️ Nghi alt/copy từ acc khác — nội dung/ảnh đã có người farm XP rồi 🧢",
  "🕵️ Bot thấy pattern multi-account — đừng share feedback/ảnh giữa các acc 👀"
];

const QUALITY_ROASTS = [
  "✍️ Feedback cần có nghĩa — gõ bừa/ lặp chữ không được tính XP 📝",
  "✍️ Dev cần mô tả thật — spam chữ giống nhau không qua được đâu 💀"
];

const BLOCKED_ROASTS = [
  "🔒 Acc đang bị tạm khóa XP do copy nội dung/ảnh từ acc khác — chờ hết hạn rồi gửi feedback mới"
];

const CAP_ROASTS = [
  "🛑 Hết quota XP hôm nay ({cap}/ngày). Mai comeback mạnh hơn 💪",
  "🛑 Daily cap {cap} XP đã full — nghỉ ngơi, mai farm tiếp 😴",
  "🛑 Hôm nay đủ rồi ({earned}/{cap} XP). Touch grass 🌿"
];

const SHORT_ROASTS = [
  "✍️ Viết dài hơn đi — @tag không tính là feedback đâu 📝",
  "✍️ Feedback hơi ngắn — thêm chi tiết cho dev hiểu nha 👌"
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function extractMinutes(reason) {
  const match = reason.match(/(\d+)\s*phút/);
  return match ? match[1] : "vài";
}

function buildSpamReply(reason) {
  if (reason.includes("chờ") && reason.includes("phút")) {
    return pickRandom(COOLDOWN_ROASTS).replace("{minutes}", extractMinutes(reason));
  }

  if (reason.includes("quá giống")) {
    return pickRandom(SIMILAR_ROASTS);
  }

  if (reason.includes("Chống farm") || reason.includes("XP trong 1 giờ")) {
    return pickRandom(VELOCITY_ROASTS).replace("{minutes}", "60");
  }

  if (reason.includes("tạm khóa XP")) {
    return pickRandom(BLOCKED_ROASTS);
  }

  if (reason.includes("nghi alt") || reason.includes("tài khoản khác")) {
    return pickRandom(ALT_ROASTS);
  }

  if (
    reason.includes("gõ bừa") ||
    reason.includes("lặp ký tự") ||
    reason.includes("3 từ khác nhau") ||
    reason.includes("random")
  ) {
    return pickRandom(QUALITY_ROASTS);
  }

  if (reason.includes("ảnh này đã được dùng") || reason.includes("ảnh này đã được tài khoản")) {
    return pickRandom(IMAGE_ROASTS);
  }

  if (reason.includes("đã được tính XP") || reason.includes("đã được dùng")) {
    return pickRandom(DUPLICATE_ROASTS);
  }

  if (reason.includes("giới hạn") || reason.includes("/ngày")) {
    const earnedMatch = reason.match(/đã nhận (\d+)/);
    const capMatch = reason.match(/(\d+) XP\/ngày/);
    return pickRandom(CAP_ROASTS)
      .replace("{earned}", earnedMatch?.[1] ?? "?")
      .replace("{cap}", capMatch?.[1] ?? "50");
  }

  if (reason.includes("quá ngắn") || reason.includes("rỗng")) {
    return pickRandom(SHORT_ROASTS);
  }

  return `🛡️ ${reason}`;
}

module.exports = { buildSpamReply };
