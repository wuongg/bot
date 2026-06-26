const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = LEVELS[process.env.LOG_LEVEL ?? "info"] ?? LEVELS.info;

function formatMessage(level, message, meta) {
  const time = new Date().toISOString();
  const base = `[${time}] ${level.toUpperCase()} ${message}`;

  if (!meta || Object.keys(meta).length === 0) {
    return base;
  }

  return `${base} ${JSON.stringify(meta)}`;
}

function log(level, message, meta) {
  if (LEVELS[level] < minLevel) {
    return;
  }

  const line = formatMessage(level, message, meta);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  debug: (message, meta) => log("debug", message, meta),
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta)
};
