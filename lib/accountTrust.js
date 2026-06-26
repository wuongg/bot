const DAILY_XP_CAP = Number(process.env.DAILY_XP_CAP) || 50;
const NEW_ACCOUNT_AGE_DAYS = Number(process.env.NEW_ACCOUNT_AGE_DAYS || 7);
const NEW_ACCOUNT_DAILY_CAP = Number(process.env.NEW_ACCOUNT_DAILY_CAP || 20);
const NEW_ACCOUNT_VELOCITY_CAP = Number(process.env.NEW_ACCOUNT_VELOCITY_CAP || 20);
const VELOCITY_XP_PER_HOUR = Number(process.env.VELOCITY_XP_PER_HOUR || 35);

function getAccountAgeDays(author) {
  const createdAt = author?.createdAt ?? author?.createdTimestamp;

  if (!createdAt) {
    return NEW_ACCOUNT_AGE_DAYS + 1;
  }

  const createdMs =
    createdAt instanceof Date ? createdAt.getTime() : Number(createdAt);

  return (Date.now() - createdMs) / 86_400_000;
}

function isNewAccount(author) {
  return getAccountAgeDays(author) < NEW_ACCOUNT_AGE_DAYS;
}

function getEffectiveDailyCap(author) {
  if (isNewAccount(author)) {
    return Math.min(DAILY_XP_CAP, NEW_ACCOUNT_DAILY_CAP);
  }

  return DAILY_XP_CAP;
}

function getEffectiveVelocityCap(author) {
  if (isNewAccount(author)) {
    return Math.min(VELOCITY_XP_PER_HOUR, NEW_ACCOUNT_VELOCITY_CAP);
  }

  return VELOCITY_XP_PER_HOUR;
}

module.exports = {
  getAccountAgeDays,
  isNewAccount,
  getEffectiveDailyCap,
  getEffectiveVelocityCap,
  NEW_ACCOUNT_AGE_DAYS,
  NEW_ACCOUNT_DAILY_CAP
};
