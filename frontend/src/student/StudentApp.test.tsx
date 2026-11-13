import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "../test/helpers";
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
    const { container } = renderApp();

    fireEvent.click(radio("Go left"));
    fireEvent.click(button("Submit"));

    expect(await screen.findByText("Score: 3/10")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Detailed Score" })).toBeNull();

    fireEvent.click(button("Show Report"));

    const report = screen.getByRole("heading", { name: "Activity Complete!" }).closest("div");
    const reportText = report ? report.textContent || "" : "";
    // Server values are rendered as-is: 43% next to a 3/10 score is never recomputed.
    // Exact values, not prefixes: /Your Score\s*3/ would also accept 30, and 10 would accept 100.
    // Read the metric values through the report's data-role hooks so the label wording
    // (which the report owns) cannot make this assertion fail for punctuation reasons.
    const metricValue = (role: string) =>
      container.querySelector(`[data-role="${role}"]`)?.textContent;
    expect(screen.getByText(/^Your Score:?$/)).toBeTruthy();
    expect(screen.getByText(/^Highest Possible Score:?$/)).toBeTruthy();
    expect(metricValue("report-score")).toBe("3");
    expect(metricValue("report-max-score")).toBe("10");
    expect(reportText).toContain("43%");
    expect(reportText).toContain("Pass");
    expect(screen.queryByText("Score: 3/10")).toBeNull();

    const table = screen.getByRole("table", { name: "Detailed Score" });
    const dataRows = within(table)
      .getAllByRole("row")
      .filter((row) => within(row).queryAllByRole("cell").length > 0);
    // The zero-point row is kept; the server's points are shown signed and never recomputed.
    expect(dataRows.map((row) => within(row).getByRole("cell").textContent)).toEqual(["+3", "+0"]);
    expect(dataRows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "Go left",
      "Never chosen",
    ]);
  });
});

describe("StudentApp: action order", () => {
  // DOM order is the Tab order: the primary action comes first, Go Back second. The
  // visual row direction is CSS and is reviewed manually.
  it("keeps the primary action before Go Back in the action bar", () => {
    const { container } = renderApp(middleState);
    const actions = container.querySelector('[data-role="actions"]') as HTMLElement;

    expect(within(actions).getAllByRole("button").map((element) => element.textContent))
      .toEqual(["Submit", "Go Back"]);
  });
});

describe("StudentApp: authored HTML stays outside the choice form", () => {
  const AUTHORED_CONTENT =
    '<p>Start content</p><form id="author-form" action="/author-handler">'
    + '<button type="submit">Author button</button></form>';

  function renderAuthoredNode() {
    const authoredNode: Node = { ...startNode, content: AUTHORED_CONTENT };
    const state = makeState({
      nodes: { ...initialState.nodes, start: authoredNode },
      current_node: authoredNode,
    });
    return renderApp(state);
  }

  it("keeps the author's form out of our form, so its button cannot submit a selection", () => {
    const { container } = renderAuthoredNode();

    const ourForm = container.querySelector('[data-role="choice-form"]') as HTMLFormElement;
    const authorForm = container.querySelector("#author-form") as HTMLFormElement;
    const authorButton = screen.getByRole("button", { name: "Author button" });

    // Both forms exist, and the authored one is neither inside ours nor a parent of it.
    expect(container.querySelectorAll("form")).toHaveLength(2);
    expect(authorForm).toBeTruthy();
    expect(authorForm.closest("form")).toBe(authorForm);
    expect(ourForm.contains(authorForm)).toBe(false);
    expect(ourForm.contains(authorButton)).toBe(false);
    expect(authorForm.contains(ourForm)).toBe(false);

    // The author's submit button submits the author's own form, never our selection.
    const authorSubmit = jest.fn();
    authorForm.addEventListener("submit", (event) => {
      authorSubmit();
      event.preventDefault();
    });
    fireEvent.click(authorButton);

    expect(authorSubmit).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(statusText()).not.toContain("Content updated.");

    // Submit sits in the footer, outside the form, and reaches it through form={id}.
    fireEvent.click(radio("Go left"));
    expect(button("Submit").disabled).toBe(false);
    fireEvent.click(button("Submit"));

    expect(postedUrl()).toBe("/handlers/select_choice");
    expect(postedBody()).toEqual({ choice_index: 0 });
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
    fireEvent.click(button("Restart"));

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

  it("goes back through the undo_choice handler and clears the selection", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, ...initialState }));
    renderApp(middleState);

    expect(button("Go Back").disabled).toBe(false);
    fireEvent.click(button("Go Back"));

    expect(await screen.findByText("Start content")).toBeTruthy();
    expect(postedUrl()).toBe("/handlers/undo_choice");
    expect(postedBody()).toEqual({});
    expect(statusText()).toContain("Content updated.");
    expect(button("Submit").disabled).toBe(true);
    expect(radio("Go left").checked).toBe(false);
    // Accepted behaviour: the first step never offers Go Back.
    expect(screen.queryByRole("button", { name: "Go Back" })).toBeNull();
  });

  it("shows a submit error as an alert and keeps the current choices", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Choice failed" }));
    renderApp();

    fireEvent.click(radio("Go left"));
    fireEvent.click(button("Submit"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Choice failed");
    // A failed submit keeps the view, the selection and the enabled Submit.
    expect(screen.getByText("Start content")).toBeTruthy();
    expect(radio("Go left").checked).toBe(true);
    expect(button("Submit").disabled).toBe(false);
    expect(postedUrl()).toBe("/handlers/select_choice");
    expect(statusText()).not.toContain("Content updated.");
  });
});

describe("StudentApp characterization: action transitions", () => {
  it("keeps the view, selection and status message when undo fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Undo failed" }));
    renderApp(middleState);

    fireEvent.click(radio("Continue"));
    expect(button("Submit").disabled).toBe(false);

    fireEvent.click(button("Go Back"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Undo failed");
    expect(screen.getByText("Middle content")).toBeTruthy();
    // A failed undo keeps the selection and every control it enables.
    expect(radio("Continue").checked).toBe(true);
    expect(button("Submit").disabled).toBe(false);
    expect(button("Go Back")).toBeTruthy();
    expect(statusText()).not.toContain("Content updated.");
    expect(postedUrl()).toBe("/handlers/undo_choice");
  });

  it("clears the previous error as soon as the next action starts", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Reset failed" }));
    renderApp(middleState);

    fireEvent.click(button("Reset"));
    expect((await screen.findByRole("alert")).textContent).toContain("Reset failed");

    let resolveUndo: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      resolveUndo = resolve;
    }));

    fireEvent.click(button("Go Back"));
    // The error is gone while the request is still in flight.
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      resolveUndo(jsonResponse({ success: true, ...initialState }));
    });
    expect(await screen.findByText("Start content")).toBeTruthy();
    expect(statusText()).toContain("Content updated.");
  });

  it("falls back to the action's own message when the request rejects without one", async () => {
    fetchMock.mockRejectedValueOnce(new Error(""));
    renderApp(middleState);

    fireEvent.click(button("Go Back"));

    expect((await screen.findByRole("alert")).textContent).toContain("Failed to undo choice");
    expect(screen.getByText("Middle content")).toBeTruthy();
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
    name: "enable_reset_activity off hides the report Restart",
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
    // Accepted behaviour: the first step never offers Go Back, terminal start nodes included.
    name: "a terminal start node offers no reset, only the report",
    state: makeState({
      current_node: { id: "start", content: "Start content", choices: [] },
      history: [],
    }),
    showReportButton: true,
    inlineScore: true,
    scenarioReset: false,
    reportReset: false,
    goBack: "hidden",
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
    // bar, so each one is only asserted in the mode where it can appear. The report's entry
    // point is "Restart"; the card header keeps the scenario's "Reset".
    if (flagCase.openReport) {
      expect(Boolean(screen.queryByRole("button", { name: "Restart" }))).toBe(flagCase.reportReset);
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
