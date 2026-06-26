function tokenize(normalized) {
  return normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function countVowels(text) {
  const matches = text.match(
    /[aeiouyàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/gi
  );
  return matches?.length ?? 0;
}

function maxCharRatio(text) {
  const chars = text.replace(/\s/g, "");

  if (chars.length === 0) {
    return 1;
  }

  const counts = {};

  for (const char of chars) {
    counts[char] = (counts[char] ?? 0) + 1;
  }

  return Math.max(...Object.values(counts)) / chars.length;
}

function analyzeContentQuality(normalized) {
  if (!normalized) {
    return { ok: false, reason: "Chống spam: nội dung trống sau khi lọc." };
  }

  const words = tokenize(normalized);
  const uniqueWords = new Set(words);
  const compact = normalized.replace(/\s/g, "");

  if (normalized.length >= 12 && uniqueWords.size < 3) {
    return {
      ok: false,
      reason: "Chống spam: feedback cần ít nhất 3 từ khác nhau — tránh spam chữ lặp."
    };
  }

  if (words.length >= 4 && uniqueWords.size === 1) {
    return {
      ok: false,
      reason: "Chống spam: lặp cùng một từ nhiều lần không được tính feedback."
    };
  }

  if (compact.length >= 10 && maxCharRatio(normalized) > 0.42) {
    return {
      ok: false,
      reason: "Chống spam: nội dung lặp ký tự — mô tả bug/ý tưởng thật nhé."
    };
  }

  if (compact.length >= 15) {
    const vowels = countVowels(compact);
    const ratio = vowels / compact.length;

    if (ratio < 0.12) {
      return {
        ok: false,
        reason: "Chống spam: nội dung giống random/gõ bừa — viết câu có nghĩa hơn."
      };
    }
  }

  const keyboardSmash = /(asdf|qwer|zxcv|hjkl|1234|abcd){2,}/i;

  if (keyboardSmash.test(normalized)) {
    return {
      ok: false,
      reason: "Chống spam: phát hiện gõ bàn phím vô nghĩa — gửi feedback thật."
    };
  }

  return { ok: true };
}

module.exports = { analyzeContentQuality, tokenize };
