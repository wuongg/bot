# Feedback XP Bot — Danh mục tính năng



> Cập nhật sau khi **xóa** streak, số may mắn, quest, bingo, mystery box, duel, voice XP, `/meme`, `/poll`.



**Slash commands: 5** — `/help`, `/stalk`, `/leaderboard`, `/topso`, `/admin`



---



## Bảng tổng quan



| # | Tính năng | User thấy? |

|---|-----------|------------|

| 1 | Feedback XP trong thread | Embed + ⭐ |

| 2 | Level + role Discord màu | Role trên server |

| 3 | Chọn số khi level up | Embed + nút + modal |

| 4 | Chống spam / gian lận | Roast text |

| 5 | `/stalk` profile | Embed gọn |

| 6 | `/leaderboard` | Text top 10 |

| 7 | `/help` + @bot chào | Text chào / `Bot chịu` + emoji |

| 8 | `/topso` | Top số hot + số hiếm |

| 9 | `/admin` | Ephemeral |

| 10 | `!ping` | Text |



**Đã xóa:** `/rank`, `/soi`, `/sonhom`, `/quest`, `/bingo`, `/duel`, `/meme`, `/poll`  

**Đã xóa (bonus):** streak, số may mắn tuần, daily quest, bingo, mystery box, duel XP, voice XP, poll tuần auto



---



## A. CORE — Feedback & XP



### A1. Cộng XP trong forum thread



| Thread | Điều kiện | XP |

|--------|-----------|-----|

| `Feedback về lỗi sản phẩm` | Ảnh/video + mô tả ≥ 10 ký tự | +10 |

| `Feedback cải thiện sản phẩm` | Text ≥ 5 ký tự | +10 |

| `Feedback cải thiện sản phẩm` | Có ảnh | +20 |

| `Feedback cải thiện UI/UX` | Text ≥ 5 ký tự | +10 |

| `Feedback cải thiện UI/UX` | Có ảnh | +20 |



**File:** `feedback.js`, `feedbackXpPipeline.js`, `events/messageCreate.js`



**Hiển thị:**

- Thường: embed xanh `+{XP} XP` + câu random + react ⭐

- Lên level: embed `🎉 LEVEL UP!` + nút chọn số



---



### A2. Level & role Discord



- 100 XP / level, max **Level 5**, role màu tự gán

- **File:** `xp.js`, `xpLevel.js`, `roles.js`



---



### A3. Chọn số khi level up



- Mỗi level → chọn số **0–999** (nút + modal)

- **File:** `numbers.js`, `numberPickUi.js`



---



### A4. Chống spam / gian lận



- Cooldown, cap ngày, velocity, fingerprint ảnh/text, alt guard, gibberish

- **File:** `antispam.js`, `lib/*`



---



## B. Lệnh slash



| Lệnh | Mô tả | File |

|------|--------|------|

| `/help` | Hướng dẫn | `commands/help.js`, `help.js` |

| `/stalk` | Avatar, level, XP, số đã chọn | `commands/stalk.js`, `profile.js` |

| `/leaderboard` | Top 10 XP | `commands/leaderboard.js` |

| `/topso` | Top số hot + số hiếm | `commands/topso.js`, `topso.js`, `numbers.js` |

| `/admin` | Quản trị XP | `commands/admin.js` |



---



## C. Tự động / scheduler



| Việc | Kênh / cấu hình | File |

|------|-----------------|------|

| Dọn fingerprint cũ | `FINGERPRINT_RETENTION_DAYS` (mặc định 90) | `scheduler.js`, `antispam.js` |

| Dọn title tạm hết hạn | — | `scheduler.js`, `xp.js` |



---



## D. Storage



- JSON local hoặc SQLite (`STORAGE=sqlite`)

- **File:** `storage/*`, `dataPath.js`

