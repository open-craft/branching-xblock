import { renderMarkdown } from "./renderMarkdown";

describe("renderMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });

  it("renders basic markdown to HTML", () => {
    const result = renderMarkdown("**bold**");
    expect(result).toContain("<strong>bold</strong>");
  });

  it("sanitizes script tags", () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("renders paragraphs", () => {
    const result = renderMarkdown("Hello world");
    expect(result).toContain("<p>Hello world</p>");
  });

  it("handles links", () => {
    const result = renderMarkdown("[link](https://example.com)");
    expect(result).toContain('<a href="https://example.com">link</a>');
  });
});
