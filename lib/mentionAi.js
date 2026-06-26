const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_AUTH_URL = "https://openrouter.ai/api/v1/auth/key";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const TIMEOUT_MS = 12_000;
const VERIFY_TIMEOUT_MS = 10_000;

const log = require("./logger");

const BOT_KNOWLEDGE = `Bot Discord "Góp tiền nuôi em" (Feedback XP).
- XP: feedback trong thread forum — cải thiện SP/UI text ≥5 ký tự +10; có ảnh +20; lỗi SP cần ảnh/video + mô tả ≥10 ký tự +10.
- Lệnh: /help, /stalk, /leaderboard, /topso, /admin.
- Level max 5, 100 XP/level, role màu; lên level chọn số 0–999.
- Không biết chi tiết sản phẩm/app — không bịa bug hay tính năng app.`;

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

function isEnabled() {
  return process.env.MENTION_AI === "true" && Boolean(getApiKey());
}

function getModel() {
  return process.env.MENTION_AI_MODEL?.trim() || DEFAULT_MODEL;
}

function buildHeaders() {
  const headers = {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json"
  };

  const referer = process.env.OPENROUTER_SITE_URL?.trim();

  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  const title = process.env.OPENROUTER_APP_NAME?.trim();

  if (title) {
    headers["X-OpenRouter-Title"] = title;
  }

  return headers;
}

function parseIntent(raw) {
  if (raw === "greeting" || raw === "answer" || raw === "deflect") {
    return raw;
  }

  return "answer";
}

async function verifyOpenRouterConnection() {
  if (process.env.MENTION_AI !== "true") {
    log.info("OpenRouter @bot AI: tắt (MENTION_AI không phải true)");
    return { ok: false, skipped: true };
  }

  if (!getApiKey()) {
    log.warn("OpenRouter @bot AI: bật nhưng thiếu OPENROUTER_API_KEY");
    return { ok: false, skipped: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_AUTH_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error("OpenRouter: kết nối thất bại", {
        status: response.status,
        detail: body.slice(0, 150)
      });
      return { ok: false };
    }

    const data = await response.json().catch(() => ({}));
    const keyLabel = data?.data?.label ?? data?.label ?? null;

    log.info("OpenRouter: đã kết nối API", {
      ok: true,
      model: getModel(),
      keyLabel
    });

    return { ok: true, model: getModel(), keyLabel };
  } catch (error) {
    log.error("OpenRouter: kết nối thất bại", { message: error.message });
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function classifyMention(text, context) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.55,
        max_tokens: 180,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Bạn là bot Discord thân thiện, nói tiếng Việt tự nhiên, ngắn gọn, hơi vui nhưng không toxic.\n" +
              `Kiến thức:\n${BOT_KNOWLEDGE}\n\n` +
              "Trả JSON: {\"intent\":\"greeting\"|\"answer\"|\"deflect\",\"reply\":\"...\"}\n\n" +
              "greeting — chào, hi, yo, đùa nhẹ. reply: 1 câu chào lại, gọi tên user.\n" +
              "answer — hỏi về bot, XP, level, lệnh, feedback, số đã chọn, user hỏi về bản thân. " +
              "Dùng context user (level, xp, pickedNumbers). reply cụ thể, hữu ích, tối đa 200 ký tự.\n" +
              "deflect — hỏi sản phẩm/app/bug kỹ thuật cụ thể, code, token, ngoài phạm vi. " +
              "reply: 1 câu từ chối nhẹ nhàng + gợi ý hỏi /help hoặc gửi feedback thread. KHÔNG dùng chữ Bot chịu.\n" +
              "Không code, URL, markdown phức tạp. Không bịa app."
          },
          {
            role: "user",
            content: JSON.stringify({
              message: text || "(chỉ @ bot, không có chữ)",
              user: context
            })
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("Empty AI response");
    }

    const parsed = JSON.parse(raw);
    const intent = parseIntent(parsed.intent);
    const reply =
      typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 220) : "";

    log.info("OpenRouter @bot AI: phản hồi OK", { intent });

    return { intent, reply };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isEnabled, classifyMention, verifyOpenRouterConnection };
