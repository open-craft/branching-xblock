import React from "react";
import { render, screen, fireEvent, waitFor } from "../test/helpers";
import StudioApp from "./StudioApp";
import * as api from "./api";

jest.mock("./api");

const mockApi = api as jest.Mocked<typeof api>;

const runtime = {
  notify: jest.fn(),
  handlerUrl: jest.fn(),
};

const baseProps = {
  handlerUrls: {
    studio_submit: "/save",
    export_nodes: "/export",
    import_nodes: "/import",
  },
  initial_state: {
    nodes: {
      "node-1": {
        id: "node-1",
        content: "Node 1",
        media: { type: "", url: "" },
        choices: [{ text: "Go", target_node_id: "node-2", score: 0 }],
        hint: "",
        left_image_url: "",
        right_image_url: "",
        left_image_alt_text: "",
        right_image_alt_text: "",
        overlay_text: false,
        transcript_url: "",
      },
      "node-2": {
        id: "node-2",
        content: "Node 2",
        media: { type: "", url: "" },
        choices: [],
        hint: "",
        left_image_url: "",
        right_image_url: "",
        left_image_alt_text: "",
        right_image_alt_text: "",
        overlay_text: false,
        transcript_url: "",
      },
    },
    enable_undo: false,
    enable_scoring: false,
    enable_reset_activity: false,
    max_score: 0,
    grade_ranges: [
      { label: "Fail", start: 0, end: 49 },
      { label: "Pass", start: 50, end: 100 },
    ],
    display_name: "Branching activity",
    background_image_url: "",
    background_image_alt_text: "",
    background_image_is_decorative: false,
  },
  meta: {
    authoring_help_html: "<p>Help content</p>",
    import_template: { nodes: [] },
  },
  runtime,
};

describe("StudioApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("surfaces a save error when the request fails", async () => {
    mockApi.saveScenario.mockRejectedValue(new Error("boom"));
    render(<StudioApp {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Error saving scenario")).toBeInTheDocument();
    });
    expect(
      screen.getByText("We weren't able to save your selections. Please try again."),
    ).toBeInTheDocument();
  });

  it("selects the first errored node after a validation failure", async () => {
    mockApi.saveScenario.mockResolvedValue({
      result: "error",
      message: "Validation errors",
      field_errors: {
        node_action_errors: {
          "node-2": {
            title: "You can't delete this node",
            detail: "Node 2 is referenced by Node 1.",
          },
        },
      },
    });

    render(<StudioApp {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Node 2" })).toBeInTheDocument();
    });
    expect(screen.getByText("Node 2 is referenced by Node 1.")).toBeInTheDocument();
  });
});
