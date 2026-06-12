import React from "react";
import { render, screen } from "../../test/helpers";
import MediaDisplay from "./MediaDisplay";
import { Node } from "../../types";

function makeNode(overrides: Partial<Node>): Node {
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
  background_image_url: "http://example.com/bg.jpg",
  background_image_alt_text: "",
  background_image_is_decorative: true,
  overlayEnabled: false,
  contentHtml: "",
};

describe("MediaDisplay", () => {
  it("renders a single image and ignores the shared background", () => {
    const node = makeNode({ media: { type: "single_image", url: "http://example.com/i.jpg", alt: "A scene" } });
    const { container } = render(<MediaDisplay node={node} {...baseProps} />);

    const img = screen.getByAltText("A scene") as HTMLImageElement;
    expect(img).toHaveClass("bx-single-image");
    expect(img.src).toContain("http://example.com/i.jpg");
    // The shared background composite must not render for a single image node.
    expect(container.querySelector(".bx-image-composite")).toBeNull();
  });

  it("renders a video even when a shared background is set (not masked)", () => {
    const node = makeNode({ media: { type: "video", url: "http://example.com/v.mp4", alt: "" } });
    const { container } = render(<MediaDisplay node={node} {...baseProps} />);

    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector(".bx-image-composite")).toBeNull();
  });

  it("renders the composite scene only for the image type", () => {
    const node = makeNode({
      media: { type: "image", url: "", alt: "" },
      left_image_url: "http://example.com/left.png",
    });
    const { container } = render(<MediaDisplay node={node} {...baseProps} />);

    expect(container.querySelector(".bx-image-composite")).not.toBeNull();
  });
});
