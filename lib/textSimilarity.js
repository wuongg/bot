function tokenize(text) {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function isSimilarText(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const minLength = Math.min(left.length, right.length);

  if (minLength < 15) {
    return false;
  }

  if (left.includes(right) || right.includes(left)) {
    const longer = Math.max(left.length, right.length);
    const shorter = Math.min(left.length, right.length);
    return shorter / longer >= 0.85;
  }

  return jaccardSimilarity(left, right) >= 0.88;
}

function findSimilarText(normalized, recentTexts = []) {
  for (const previous of recentTexts) {
    if (isSimilarText(normalized, previous)) {
      return previous;
    }
  }

  return null;
}

module.exports = { isSimilarText, findSimilarText, jaccardSimilarity };
