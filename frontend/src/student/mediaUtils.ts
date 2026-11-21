import { Node } from "../types";

/** What a node will actually show, decided once for both the layout and the renderer. */
export type NodeMedia =
  | { kind: "none" }
  | { kind: "composite"; backgroundOnly: boolean; overlay: boolean }
  | { kind: "single_image"; url: string; alt: string }
  | { kind: "audio"; url: string }
  | { kind: "video"; url: string };

const NO_MEDIA: NodeMedia = { kind: "none" };

/**
 * Presence is part of the decision: a composite needs a background or a foreground image,
 * so a node with neither shows no media and keeps its authored text.
 */
export function describeNodeMedia(node: Node, backgroundImageUrl: string): NodeMedia {
  const media = node.media || { type: "", url: "", alt: "" };
  const mediaType = media.type || "";
  const mediaUrl = media.url || "";

  if (mediaType === "image") {
    const backgroundOnly = !(node.left_image_url || node.right_image_url);
    if (backgroundOnly && !backgroundImageUrl) {
      return NO_MEDIA;
    }
    return { kind: "composite", backgroundOnly, overlay: Boolean(node.overlay_text) };
  }
  if (mediaType === "single_image" && mediaUrl) {
    return { kind: "single_image", url: mediaUrl, alt: media.alt || "" };
  }
  if (mediaType === "audio" && mediaUrl) {
    return { kind: "audio", url: mediaUrl };
  }
  if (mediaType === "video" && mediaUrl) {
    return { kind: "video", url: mediaUrl };
  }
  return NO_MEDIA;
}

function normalizeYouTube(u: URL, host: string): string | null {
  if (!host.includes("youtube.com") && !host.includes("youtu.be")) {
    return null;
  }
  let videoId = u.searchParams.get("v");
  if (!videoId && host.includes("youtu.be")) {
    videoId = u.pathname.split("/").filter(Boolean)[0];
  }
  if (!videoId && u.pathname.includes("/embed/")) {
    videoId = u.pathname.split("/").filter(Boolean).pop() || null;
  }
  if (!videoId && u.pathname.includes("/shorts/")) {
    videoId = u.pathname.split("/").filter(Boolean).pop() || null;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function normalizeVimeo(u: URL, host: string): string | null {
  if (!host.includes("vimeo.com")) {
    return null;
  }
  const parts = u.pathname.split("/").filter(Boolean);
  const last = parts.pop();
  if (last && /^\d+$/.test(last)) {
    return `https://player.vimeo.com/video/${last}`;
  }
  return null;
}

function normalizePanopto(u: URL, host: string): string | null {
  if (!host.includes("panopto")) {
    return null;
  }
  const id = u.searchParams.get("id");
  if (!id) {
    return null;
  }
  return `${u.origin}/Panopto/Pages/Embed.aspx?id=${id}&autoplay=false`;
}

export function normalizeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return normalizeYouTube(u, host) || normalizeVimeo(u, host) || normalizePanopto(u, host);
  } catch {
    return null;
  }
}

const MEDIA_FILE_REGEX = /\.(mp4|webm|ogg|mp3|wav)(\?|#|$)/i;

export function isMediaFile(url: string): boolean {
  return MEDIA_FILE_REGEX.test(url || "");
}
