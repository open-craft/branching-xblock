import React from "react";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "../../test/helpers";
import MediaDisplay from "./MediaDisplay";
import { Node } from "../../types";

const BACKGROUND_URL = "http://example.com/bg.jpg";

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "n1",
    content: "",
    media: { type: "", url: "", alt: "" },
    choices: [],
    hint: "",
    left_image_url: "",
    right_image_url: "",
    left_image_alt_text: "",
    right_image_alt_text: "",
    overlay_text: false,
    transcript_url: "",
    ...overrides,
  };
}

const baseProps = {
  background_image_url: BACKGROUND_URL,
  background_image_alt_text: "",
  background_image_is_decorative: true,
  contentHtml: "",
};

describe("MediaDisplay renders the decision it is given", () => {
  it("renders a composite with background and foreground images", () => {
    const node = makeNode({ left_image_url: "http://example.com/left.png" });

    const { container } = render(
      <MediaDisplay
        node={node}
        media={{ kind: "composite", backgroundOnly: false, overlay: false }}
        {...baseProps}
      />,
    );

    expect(container.querySelector(".bx-image-composite")).not.toBeNull();
    expect(container.querySelector(".bx-image-composite__fg")).not.toBeNull();
    // Background plus the one foreground image.
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("marks a background-only composite and renders no foreground group", () => {
    const { container } = render(
      <MediaDisplay
        node={makeNode()}
        media={{ kind: "composite", backgroundOnly: true, overlay: false }}
        {...baseProps}
      />,
    );

    expect(container.querySelector(".bx-image-composite--bg-only")).not.toBeNull();
    expect(container.querySelector(".bx-image-composite__fg")).toBeNull();
  });

  it("puts the authored html inside the composite overlay when the decision says so", () => {
    const { container } = render(
      <MediaDisplay
        node={makeNode()}
        media={{ kind: "composite", backgroundOnly: false, overlay: true }}
        {...baseProps}
        contentHtml="<p>Overlay copy</p>"
      />,
    );

    const overlay = container.querySelector(".media-overlay__text");
    expect(overlay?.innerHTML).toContain("Overlay copy");
  });

  it("renders a hosted video file as a video element", () => {
    const { container } = render(
      <MediaDisplay node={makeNode()} media={{ kind: "video", url: "http://example.com/v.mp4" }} {...baseProps} />,
    );

    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders a provider video url as a sandboxed embed", () => {
    const { container } = render(
      <MediaDisplay
        node={makeNode()}
        media={{ kind: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }}
        {...baseProps}
      />,
    );

    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(frame.getAttribute("title")).toBe("Embedded media");
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-popups allow-forms");
  });

  it("renders a single image with its own alt text and no composite", () => {
    const { container } = render(
      <MediaDisplay
        node={makeNode()}
        media={{ kind: "single_image", url: "http://example.com/i.jpg", alt: "A scene" }}
        {...baseProps}
      />,
    );

    expect((screen.getByAltText("A scene") as HTMLImageElement).src).toContain("http://example.com/i.jpg");
    expect(container.querySelector(".bx-image-composite")).toBeNull();
  });

  it("renders nothing at all when there is no media", () => {
    const { container } = render(
      <MediaDisplay node={makeNode()} media={{ kind: "none" }} {...baseProps} />,
    );

    expect(container.querySelector('[data-role="media"]')).toBeNull();
    expect(container.textContent).toBe("");
  });
});
