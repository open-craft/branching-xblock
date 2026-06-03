import { normalizeEmbedUrl, isMediaFile } from "../student/mediaUtils";

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
