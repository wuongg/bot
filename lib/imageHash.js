const crypto = require("crypto");

const MAX_BYTES = Number(process.env.IMAGE_HASH_MAX_BYTES || 5 * 1024 * 1024);
const TIMEOUT_MS = Number(process.env.IMAGE_HASH_TIMEOUT_MS || 12_000);

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function hashAttachmentUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      const head = buffer.subarray(0, 64_000);
      const tail = buffer.subarray(buffer.length - 64_000);
      return hashBuffer(Buffer.concat([head, tail, Buffer.from(String(buffer.length))]));
    }

    return hashBuffer(buffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function hashMessageImages(message) {
  const hashes = [];

  for (const attachment of message.attachments.values()) {
    const type = attachment.contentType ?? "";

    if (!type.startsWith("image/")) {
      continue;
    }

    const hash = await hashAttachmentUrl(attachment.url);

    if (hash) {
      hashes.push(hash);
      continue;
    }

    hashes.push(`id:${attachment.id}`);
  }

  return hashes;
}

module.exports = { hashMessageImages, hashAttachmentUrl, hashBuffer };
