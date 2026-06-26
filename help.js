const { MAX_LEVEL } = require("./roles");

function buildHelpMessage() {
  return `👋 **Xin chào! Mình là Bot Feedback XP.**

## 📋 Lệnh cơ bản
• \`/help\` — Bản hướng dẫn này
• \`/stalk [@user]\` — Xem avatar, level, XP và số đã chọn
• \`/leaderboard\` — Top 10 XP
• \`/topso\` — Top số hot và số hiếm

## ⭐ Cộng XP (thread feedback)
| Thread | Điều kiện | XP |
|--------|-----------|-----|
| **Cải thiện sản phẩm** | ≥ 5 ký tự | +10 |
| **Cải thiện UI/UX** | ≥ 5 ký tự | +10 |
| **Lỗi sản phẩm** | Ảnh/video + mô tả ≥ 10 ký tự | +10 |
| Có **ảnh minh họa** | — | +20 |

## 📈 Level (max ${MAX_LEVEL})
• 100 XP / level · Role màu theo level
• Lên level → chọn số **0–999** cho từng level`;
}

module.exports = { buildHelpMessage };
