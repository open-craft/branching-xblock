import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "../test/helpers";
import StudentApp from "./StudentApp";
import { StudentInitialState } from "../apiTypes";
import { Node } from "../types";

// Media contract for the student view, exercised through the real StudentApp, its real
// components and the real ./api and ../request. Only the HTTP layer is stubbed: none of
// these node fixtures submit a choice, so fetch stays unused. Assertions stay on roles,
// accessible names and element attributes, never on classes, style or layout, so the
// forthcoming markup redesign can change composition without weakening this contract.
const handlerUrls = {
  select_choice: "/handlers/select_choice",
  undo_choice: "/handlers/undo_choice",
  reset_activity: "/handlers/reset_activity",
};

const BACKGROUND_URL = "http://example.com/background.jpg";
const LEFT_URL = "http://example.com/left.png";
const RIGHT_URL = "http://example.com/right.png";

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "media-node",
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

function makeState(node: Node, overrides: Partial<StudentInitialState> = {}): StudentInitialState {
  return {
    nodes: { [node.id as string]: node },
    start_node_id: node.id || null,
    enable_undo: true,
    enable_scoring: true,
    enable_reset_activity: true,
    background_image_url: "",
    background_image_alt_text: "",
    background_image_is_decorative: false,
    max_score: 10,
    current_node: node,
    history: [],
    score: 0,
    grade_report: {
      score: 0,
      max_score: 10,
      percentage: 0,
      grade_label: "",
      is_pass_style: false,
      detailed_scores: [],
    },
    ...overrides,
  };
}

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock;
});

function renderApp(state: StudentInitialState) {
  return render(<StudentApp handlerUrls={handlerUrls} initial_state={state} />);
}

function imgBySrc(container: HTMLElement, src: string): HTMLImageElement | null {
  return container.querySelector(`img[src="${src}"]`);
}

describe("StudentApp media: single image", () => {
  it("renders the node image from its own attributes and ignores the shared background", () => {
    const url = "http://example.com/scene.jpg";
    const node = makeNode({ media: { type: "single_image", url, alt: "A scene" } });
    const { container } = renderApp(
      makeState(node, {
        background_image_url: BACKGROUND_URL,
        background_image_alt_text: "Shared backdrop",
      }),
    );

    // Source and alt are element attributes, so sizing stays intrinsic to the image.
    const image = screen.getByRole("img", { name: "A scene" }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe(url);
    expect(image.getAttribute("alt")).toBe("A scene");

    // Exactly one image: the shared background is not composited behind a single image.
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(imgBySrc(container, BACKGROUND_URL)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("StudentApp media: composite image", () => {
  it("renders background and foreground images, hiding a decorative background from assistive tech", () => {
    const node = makeNode({
      media: { type: "image", url: "", alt: "" },
      left_image_url: LEFT_URL,
      left_image_alt_text: "Left character",
      right_image_url: RIGHT_URL,
      right_image_alt_text: "Right character",
    });
    const state = makeState(node, {
      background_image_url: BACKGROUND_URL,
      background_image_alt_text: "Shared backdrop",
      background_image_is_decorative: true,
    });

    const { container, unmount } = renderApp(state);

    expect(container.querySelectorAll("img")).toHaveLength(3);
    const background = imgBySrc(container, BACKGROUND_URL) as HTMLImageElement;
    expect(background.getAttribute("alt")).toBe("");
    expect(background.getAttribute("aria-hidden")).toBe("true");
    expect((screen.getByRole("img", { name: "Left character" }) as HTMLImageElement).getAttribute("src")).toBe(LEFT_URL);
    expect((screen.getByRole("img", { name: "Right character" }) as HTMLImageElement).getAttribute("src")).toBe(RIGHT_URL);
    // A decorative background exposes no accessible image beyond the two foregrounds.
    expect(screen.getAllByRole("img")).toHaveLength(2);

    // The same background is announced when the author marks it as meaningful.
    unmount();
    const meaningful = renderApp(
      makeState(node, {
        background_image_url: BACKGROUND_URL,
        background_image_alt_text: "Shared backdrop",
        background_image_is_decorative: false,
      }),
    );
    const announced = imgBySrc(meaningful.container, BACKGROUND_URL) as HTMLImageElement;
    expect(announced.getAttribute("alt")).toBe("Shared backdrop");
    expect(announced.hasAttribute("aria-hidden")).toBe(false);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("shows the node content as the composite overlay once instead of beside the image", () => {
    const node = makeNode({
      content: "<p>Overlay copy with <strong>emphasis</strong></p>",
      media: { type: "image", url: "", alt: "" },
      overlay_text: true,
      left_image_url: LEFT_URL,
      left_image_alt_text: "Left character",
    });

    renderApp(makeState(node, { background_image_url: BACKGROUND_URL }));

    // The HTML is rendered, not escaped, and appears exactly once (no duplicated content block).
    expect(screen.getByText("emphasis").tagName).toBe("STRONG");
    expect((document.body.textContent || "").match(/Overlay copy with/g)).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Left character" })).toBeTruthy();
  });
});

describe("StudentApp media: audio and video transcripts", () => {
  it("renders audio with native controls and a transcript link opened in a new tab", () => {
    const url = "http://example.com/audio.mp3";
    const transcript = "http://example.com/audio-transcript.vtt";
    const node = makeNode({
      media: { type: "audio", url },
      transcript_url: transcript,
    });
    const { container } = renderApp(makeState(node));

    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio.getAttribute("src")).toBe(url);
    expect(audio.hasAttribute("controls")).toBe(true);

    const link = screen.getByRole("link", { name: "Download transcript" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(transcript);
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders a hosted video file with native controls and its transcript link", () => {
    const url = "http://example.com/video.mp4";
    const transcript = "http://example.com/video-transcript.vtt";
    const node = makeNode({
      media: { type: "video", url },
      transcript_url: transcript,
    });
    const { container } = renderApp(makeState(node));

    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe(url);
    expect(video.hasAttribute("controls")).toBe(true);
    expect(
      (screen.getByRole("link", { name: "Download transcript" }) as HTMLAnchorElement).getAttribute("href"),
    ).toBe(transcript);
  });
});

describe("StudentApp media: hints", () => {
  it("keeps a media node's hint reachable and label-driven", () => {
    const node = makeNode({
      media: { type: "single_image", url: "http://example.com/scene.jpg", alt: "A scene" },
      hint: "Look at the river level.",
    });
    renderApp(makeState(node));

    const summary = screen.getByText("Show hint");
    const details = summary.closest("details") as HTMLDetailsElement;
    expect(details).toBeTruthy();
    expect(document.body.textContent).toContain("Hint: Look at the river level.");

    // jsdom does not perform the <summary> default action, so open the disclosure directly.
    details.open = true;
    fireEvent(details, new Event("toggle"));

    expect(screen.getByText("Hide")).toBeTruthy();
    // The image stays available while the hint is open.
    expect(screen.getByRole("img", { name: "A scene" })).toBeTruthy();
  });
});
