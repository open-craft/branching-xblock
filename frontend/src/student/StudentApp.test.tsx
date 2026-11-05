import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "../test/helpers";
import StudentApp from "./StudentApp";
import { StudentInitialState } from "../apiTypes";
import { Node } from "../types";

// Characterization of the current student view. Production code is untouched: the only
// mocked seam is the HTTP layer (global fetch), so the real ./api and ../request run.
const handlerUrls = {
  select_choice: "/handlers/select_choice",
  undo_choice: "/handlers/undo_choice",
  reset_activity: "/handlers/reset_activity",
};

const startNode: Node = {
  id: "start",
  content: "Start content",
  choices: [
    { text: "Go left", target_node_id: "finish", score: 3 },
    { text: "Go right", target_node_id: "finish", score: 0 },
  ],
};

const middleNode: Node = {
  id: "middle",
  content: "Middle content",
  choices: [{ text: "Continue", target_node_id: "finish", score: 0 }],
};

const terminalNode: Node = { id: "finish", content: "You finished", choices: [] };

function makeState(overrides: Partial<StudentInitialState> = {}): StudentInitialState {
  return {
    nodes: { start: startNode, middle: middleNode, finish: terminalNode },
    start_node_id: "start",
    enable_undo: true,
    enable_scoring: true,
    enable_reset_activity: true,
    background_image_url: "",
    background_image_alt_text: "",
    background_image_is_decorative: false,
    max_score: 10,
    current_node: null,
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

const initialState = makeState();

// Server payload after choosing "Go left". 43% deliberately contradicts 3/10 (30%),
// so any client-side recalculation of the percentage would be visible.
const terminalState = makeState({
  current_node: terminalNode,
  history: ["start"],
  score: 3,
  grade_report: {
    score: 3,
    max_score: 10,
    percentage: 43,
    grade_label: "Pass",
    is_pass_style: true,
    detailed_scores: [
      { choice_text: "Go left", awarded_points: 3 },
      { choice_text: "Never chosen", awarded_points: 0 },
    ],
  },
});

const middleState = makeState({ current_node: middleNode, history: ["start"] });

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  global.fetch = fetchMock;
});

function renderApp(state: StudentInitialState = initialState) {
  return render(<StudentApp handlerUrls={handlerUrls} initial_state={state} />);
}

function postedUrl(call = 0): string {
  return String(fetchMock.mock.calls[call][0]);
}

function postedBody(call = 0): unknown {
  const init = fetchMock.mock.calls[call][1];
  return JSON.parse(String(init && init.body));
}

// Presence is the contract: controls and text are rendered or not rendered at all, and
// role queries only resolve elements that are exposed to assistive technology.
function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function radio(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

function statusText(): string {
  return screen.getByRole("status").textContent || "";
}

describe("StudentApp characterization: scenario to report journey", () => {
  it("keeps Submit disabled until a choice is selected, then posts the selected index", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...terminalState }));
    renderApp();

    expect(screen.getByText("Start content")).toBeTruthy();
    expect(button("Submit").disabled).toBe(true);
    // Reset is position-gated, not progress-gated: the start node never offers it.
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();

    fireEvent.click(radio("Go left"));
    expect(button("Submit").disabled).toBe(false);

    fireEvent.click(button("Submit"));

    expect(await screen.findByText("You finished")).toBeTruthy();
    expect(postedUrl()).toBe("/handlers/select_choice");
    expect(postedBody()).toEqual({ choice_index: 0 });
  });

  it("shows the inline score then the report with the server's values verbatim", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...terminalState }));
    renderApp();

    fireEvent.click(radio("Go left"));
    fireEvent.click(button("Submit"));

    expect(await screen.findByText("Score: 3/10")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detailed Score" })).toBeNull();

    fireEvent.click(button("Show Report"));

    const report = screen.getByRole("heading", { name: "Activity Complete!" }).closest("div");
    const reportText = report ? report.textContent || "" : "";
    // Server values are rendered as-is: 43% next to a 3/10 score is never recomputed.
    // Exact values, not prefixes: /Your Score\s*3/ would also accept 30, and 10 would accept 100.
    expect(screen.getByText("Your Score").parentElement?.textContent).toBe("Your Score3");
    expect(screen.getByText("Highest Possible Score").parentElement?.textContent).toBe(
      "Highest Possible Score10",
    );
    expect(reportText).toContain("43%");
    expect(reportText).toContain("Pass");
    expect(screen.queryByText("Score: 3/10")).toBeNull();

    const table = screen.getByRole("table", { name: "Detailed Score" });
    const cellsOf = (row: HTMLElement) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent);
    const dataRows = within(table)
      .getAllByRole("row")
      .filter((row) => within(row).queryAllByRole("cell").length > 0);
    // The zero-point row is kept, and points are neither rounded nor recomputed.
    expect(dataRows.map(cellsOf)).toEqual([
      ["Go left", "3"],
      ["Never chosen", "0"],
    ]);
  });
});

describe("StudentApp characterization: reset journeys", () => {
  it("resets from the report through the reset_activity handler and returns to the initial state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...terminalState }));
    renderApp();

    fireEvent.click(radio("Go left"));
    fireEvent.click(button("Submit"));
    await screen.findByText("Score: 3/10");
    fireEvent.click(button("Show Report"));

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...initialState }));
    fireEvent.click(button("Reset Activity"));

    expect(await screen.findByText("Start content")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(postedUrl(1)).toBe("/handlers/reset_activity");
    expect(postedBody(1)).toEqual({});
    expect(button("Submit").disabled).toBe(true);
    expect(screen.queryByText("Activity Complete!")).toBeNull();
    expect(statusText()).toContain("Content updated.");
  });

  it("resets from the scenario through the same reset_activity handler", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...initialState }));
    renderApp(middleState);

    fireEvent.click(button("Reset"));

    expect(await screen.findByText("Start content")).toBeTruthy();
    expect(postedUrl()).toBe("/handlers/reset_activity");
    expect(postedBody()).toEqual({});
    expect(statusText()).toContain("Content updated.");
  });

  it("shows a reset error without losing the current view", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Reset failed" }));
    renderApp(middleState);

    fireEvent.click(button("Reset"));

    expect(await screen.findByText("Reset failed")).toBeTruthy();
    expect(screen.getByText("Middle content")).toBeTruthy();
    expect(radio("Continue").checked).toBe(false);
    expect(button("Reset")).toBeTruthy();
    expect(button("Submit").disabled).toBe(true);
    expect(statusText()).not.toContain("Content updated.");
  });
});

type FlagCase = {
  name: string;
  state: StudentInitialState;
  openReport?: boolean;
  showReportButton: boolean;
  inlineScore: boolean;
  scenarioReset: boolean;
  reportReset: boolean;
  goBack: "enabled" | "disabled" | "hidden";
};

const flagCases: FlagCase[] = [
  {
    name: "enable_scoring off hides Show Report and the inline score",
    state: makeState({ current_node: terminalNode, history: ["start"], enable_scoring: false }),
    showReportButton: false,
    inlineScore: false,
    scenarioReset: true,
    reportReset: false,
    goBack: "enabled",
  },
  {
    name: "enable_reset_activity off hides the scenario Reset",
    state: makeState({ current_node: middleNode, history: ["start"], enable_reset_activity: false }),
    showReportButton: false,
    inlineScore: false,
    scenarioReset: false,
    reportReset: false,
    goBack: "enabled",
  },
  {
    // Opening the report replaces the scenario controls, so the action bar is gone.
    name: "enable_reset_activity off hides Reset Activity inside the report",
    state: makeState({ current_node: terminalNode, history: ["start"], enable_reset_activity: false }),
    openReport: true,
    showReportButton: false,
    inlineScore: false,
    scenarioReset: false,
    reportReset: false,
    goBack: "hidden",
  },
  {
    name: "enable_undo off keeps Go Back disabled even with history",
    state: makeState({ current_node: middleNode, history: ["start"], enable_undo: false }),
    showReportButton: false,
    inlineScore: false,
    scenarioReset: true,
    reportReset: false,
    goBack: "disabled",
  },
  {
    name: "enable_undo on with empty history keeps Go Back disabled",
    state: makeState({ current_node: middleNode, history: [] }),
    showReportButton: false,
    inlineScore: false,
    scenarioReset: true,
    reportReset: false,
    goBack: "disabled",
  },
  {
    name: "enable_undo on with history enables Go Back",
    state: makeState({ current_node: middleNode, history: ["start"] }),
    showReportButton: false,
    inlineScore: false,
    scenarioReset: true,
    reportReset: false,
    goBack: "enabled",
  },
  {
    // Current rule: reset also needs current_node.id !== start_node_id, terminal start node included.
    name: "a terminal start node offers no reset, only the report",
    state: makeState({
      current_node: { id: "start", content: "Start content", choices: [] },
      history: [],
    }),
    showReportButton: true,
    inlineScore: true,
    scenarioReset: false,
    reportReset: false,
    goBack: "disabled",
  },
  {
    // Same position gate inside the report, with progress present: no reset is offered there either.
    name: "a terminal start node offers no reset inside the report",
    state: makeState({
      current_node: { id: "start", content: "Start content", choices: [] },
      history: ["middle"],
    }),
    openReport: true,
    showReportButton: false,
    inlineScore: false,
    scenarioReset: false,
    reportReset: false,
    goBack: "hidden",
  },
];

describe("StudentApp characterization: author flags", () => {
  it.each(flagCases)("$name", (flagCase) => {
    renderApp(flagCase.state);
    if (flagCase.openReport) {
      fireEvent.click(button("Show Report"));
    }

    expect(Boolean(screen.queryByRole("button", { name: "Show Report" }))).toBe(flagCase.showReportButton);
    expect(Boolean(screen.queryByText(/^Score: /))).toBe(flagCase.inlineScore);
    // The two reset entry points are mutually exclusive: opening the report unmounts the action
    // bar, so each one is only asserted in the mode where it can appear.
    if (flagCase.openReport) {
      expect(Boolean(screen.queryByRole("button", { name: "Reset Activity" }))).toBe(flagCase.reportReset);
    } else {
      expect(Boolean(screen.queryByRole("button", { name: "Reset" }))).toBe(flagCase.scenarioReset);
    }

    const goBack = screen.queryByRole("button", { name: "Go Back" });
    if (flagCase.goBack === "hidden") {
      expect(goBack).toBeNull();
    } else {
      expect((goBack as HTMLButtonElement).disabled).toBe(flagCase.goBack === "disabled");
    }
  });
});
