function getLevel(xp) {
  if (xp <= 0) return 0;
  return Math.min(Math.floor(xp / 100) + 1, 5);
}

module.exports = { getLevel };
