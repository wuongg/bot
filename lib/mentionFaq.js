function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FAQ_ENTRIES = [
  {
    id: "feedback_where",
    test: (n) =>
      /\b(feedback|gop y|gui y kien|dong gop)\b/.test(n) &&
      /\b(o dau|ở đâu|gui sao|gui o dau|thread|kenh)\b/.test(n),
    reply: (name) =>
      `${name} ơi, gửi feedback trong **thread forum** đúng loại (cải thiện SP/UI, lỗi SP kèm ảnh). ` +
      `Đúng điều kiện thì bot tự cộng XP và react ⭐.`
  },
  {
    id: "no_xp",
    test: (n) =>
      /\b(khong|ko|chua)\s*(duoc|cong|nhan)\s*xp\b/.test(n) ||
      /\b(sao|vi sao|tai sao)\s+.*\bxp\b/.test(n) ||
      /\bbi chan\b.*\bxp\b/.test(n) ||
      /\bxp\b.*\b(bi chan|khong duoc)\b/.test(n),
    reply: (name) =>
      `${name} ơi, thường do: sai thread, thiếu ký tự/ảnh, **cooldown**, hoặc **hết cap XP/ngày**. ` +
      `Gửi đúng thread feedback và đợi vài phút rồi thử lại nhé.`
  },
  {
    id: "help",
    test: (n) =>
      /\b(lenh|help|huong dan|huong dan|command)\b/.test(n) ||
      /\b(co|co nhung)\s+lenh\b/.test(n),
    reply: (name) =>
      `${name} ơi, dùng \`/help\`, \`/stalk\`, \`/leaderboard\`, \`/topso\`. ` +
      `Admin có \`/admin\`. Feedback trong thread mới cộng XP.`
  },
  {
    id: "leaderboard",
    test: (n) =>
      /\b(top|bxh|bang xep hang|leaderboard|ai manh nhat|top 1)\b/.test(n),
    reply: (name) =>
      `${name} ơi, xem \`/leaderboard\` — top 10 XP server. ` +
      `Muốn xem số đã chọn thì \`/topso\`.`
  },
  {
    id: "how_xp",
    test: (n) =>
      /\b(lam sao|lam the nao|kiem|nhan|cong)\s+.*\bxp\b/.test(n) ||
      /\bxp\b.*\b(nhu the nao|lam sao)\b/.test(n),
    reply: (name) =>
      `${name} ơi, gửi feedback hợp lệ trong thread: text ≥5 ký tự (+10 XP), có ảnh (+20), ` +
      `lỗi SP cần ảnh/video + mô tả ≥10 ký tự.`
  }
];

function matchFaq(text) {
  const normalized = normalize(text);

  if (!normalized) {
    return null;
  }

  for (const entry of FAQ_ENTRIES) {
    if (entry.test(normalized)) {
      return entry;
    }
  }

  return null;
}

function buildFaqReply(text, name) {
  const entry = matchFaq(text);
  return entry ? entry.reply(name) : null;
}

module.exports = { matchFaq, buildFaqReply, normalize };
