function getAdminIds() {
  const raw = process.env.ADMIN_USER_IDS ?? "";

  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isAdmin(userId) {
  const admins = getAdminIds();
  return admins.length > 0 && admins.includes(userId);
}

module.exports = { isAdmin, getAdminIds };
