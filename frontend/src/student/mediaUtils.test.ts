import { describe, expect, it } from "@jest/globals";
import { describeNodeMedia, normalizeEmbedUrl, isMediaFile } from "../student/mediaUtils";
import { Node } from "../types";

const BACKGROUND = "http://example.com/background.jpg";

function makeNode(overrides: Partial<Node> = {}): Node {
  return { id: "n1", content: "", media: { type: "", url: "", alt: "" }, ...overrides };
}

describe("normalizeEmbedUrl", () => {
  it("normalizes standard YouTube URL", () => {
    const result = normalizeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("normalizes youtu.be short URL", () => {
    const result = normalizeEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("normalizes YouTube embed URL", () => {
    const result = normalizeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("normalizes Vimeo URL", () => {
    const result = normalizeEmbedUrl("https://vimeo.com/123456789");
    expect(result).toBe("https://player.vimeo.com/video/123456789");
  });

  it("normalizes Panopto URL", () => {
    const result = normalizeEmbedUrl("https://example.panopto.com/Panopto/Pages/Viewer.aspx?id=abc123");
    expect(result).toBe("https://example.panopto.com/Panopto/Pages/Embed.aspx?id=abc123&autoplay=false");
  });

  it("returns null for invalid URLs", () => {
    expect(normalizeEmbedUrl("not-a-url")).toBeNull();
  });

  it("returns null for non-embeddable URLs", () => {
    expect(normalizeEmbedUrl("https://example.com/page")).toBeNull();
  });
});

describe("describeNodeMedia", () => {
  it("shows a composite for foreground images, background or not", () => {
    const foreground = makeNode({ media: { type: "image" }, left_image_url: "http://example.com/left.png" });

    expect(describeNodeMedia(foreground, "")).toEqual({
      kind: "composite",
      backgroundOnly: false,
      overlay: false,
    });
    expect(describeNodeMedia(foreground, BACKGROUND)).toEqual({
      kind: "composite",
      backgroundOnly: false,
      overlay: false,
    });
  });

  it("marks a composite with no foreground as background-only", () => {
    const node = makeNode({ media: { type: "image" } });

    expect(describeNodeMedia(node, BACKGROUND)).toEqual({
      kind: "composite",
      backgroundOnly: true,
      overlay: false,
    });
  });

  it("shows no media for a composite with no background and no foreground", () => {
    expect(describeNodeMedia(makeNode({ media: { type: "image" } }), "")).toEqual({ kind: "none" });
  });

  it("keeps overlay_text as text when the composite has nothing to show", () => {
    const node = makeNode({ media: { type: "image" }, overlay_text: true });

    expect(describeNodeMedia(node, "")).toEqual({ kind: "none" });
  });

  it("carries the overlay decision for a composite that renders", () => {
    const node = makeNode({ media: { type: "image" }, overlay_text: true });

    expect(describeNodeMedia(node, BACKGROUND)).toEqual({
      kind: "composite",
      backgroundOnly: true,
      overlay: true,
    });
  });

  it("ignores a stale media url on a composite", () => {
    const node = makeNode({ media: { type: "image", url: "http://example.com/pic.jpg" } });

    expect(describeNodeMedia(node, "")).toEqual({ kind: "none" });
  });

  it("leaves a text node text-only even with a scenario background", () => {
    expect(describeNodeMedia(makeNode(), BACKGROUND)).toEqual({ kind: "none" });
  });

  it("classifies single_image, audio and video by their own url", () => {
    const single = makeNode({ media: { type: "single_image", url: "http://example.com/i.jpg", alt: "A scene" } });
    const audio = makeNode({ media: { type: "audio", url: "http://example.com/a.mp3" } });
    const video = makeNode({ media: { type: "video", url: "https://youtu.be/abc" } });

    expect(describeNodeMedia(single, BACKGROUND)).toEqual({
      kind: "single_image",
      url: "http://example.com/i.jpg",
      alt: "A scene",
    });
    expect(describeNodeMedia(audio, "")).toEqual({ kind: "audio", url: "http://example.com/a.mp3" });
    // A video keeps its url: file-or-embed stays the renderer's call.
    expect(describeNodeMedia(video, "")).toEqual({ kind: "video", url: "https://youtu.be/abc" });
  });

  it("shows nothing for a media type with no url", () => {
    expect(describeNodeMedia(makeNode({ media: { type: "video" } }), "")).toEqual({ kind: "none" });
    expect(describeNodeMedia(makeNode({ media: { type: "audio" } }), "")).toEqual({ kind: "none" });
    expect(describeNodeMedia(makeNode({ media: { type: "single_image" } }), "")).toEqual({ kind: "none" });
  });

  it("shows nothing for an unknown media type or a missing media object", () => {
    const unknown = makeNode({ media: { type: "document", url: "http://example.com/doc.pdf" } });
    const legacy = makeNode();
    delete legacy.media;

    expect(describeNodeMedia(unknown, BACKGROUND)).toEqual({ kind: "none" });
    expect(describeNodeMedia(legacy, BACKGROUND)).toEqual({ kind: "none" });
  });
});

describe("isMediaFile", () => {
  it("returns true for .mp4 files", () => {
    expect(isMediaFile("https://example.com/video.mp4")).toBe(true);
  });

  it("returns true for .mp3 files", () => {
    expect(isMediaFile("https://example.com/audio.mp3")).toBe(true);
  });

  it("returns false for youtube URLs", () => {
    expect(isMediaFile("https://youtube.com/watch?v=test")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isMediaFile("")).toBe(false);
  });
});
