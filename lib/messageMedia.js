const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|gifv)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic)$/i;

function isVideoAttachment(file) {
  const type = (file.contentType ?? "").toLowerCase();

  if (type.startsWith("video/")) {
    return true;
  }

  return VIDEO_EXT.test(file.name ?? "");
}

function isImageAttachment(file) {
  const type = (file.contentType ?? "").toLowerCase();

  if (type.startsWith("image/")) {
    return true;
  }

  return IMAGE_EXT.test(file.name ?? "");
}

function hasEmbedMedia(message) {
  return (message.embeds ?? []).some((embed) => {
    if (embed.video?.url || embed.image?.url) {
      return true;
    }

    const type = (embed.type ?? "").toLowerCase();

    return type === "video" || type === "gifv" || type === "image";
  });
}

function hasMessageImage(message) {
  if (message.attachments?.some(isImageAttachment)) {
    return true;
  }

  return (message.embeds ?? []).some((embed) => embed.image?.url);
}

function hasMessageImageOrVideo(message) {
  if (message.attachments?.some((file) => isImageAttachment(file) || isVideoAttachment(file))) {
    return true;
  }

  return hasEmbedMedia(message);
}

module.exports = {
  hasMessageImage,
  hasMessageImageOrVideo,
  isImageAttachment,
  isVideoAttachment
};
