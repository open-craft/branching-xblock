import React from "react";
// Brings the jest-dom matcher types into this file's jest globals.
import "@testing-library/jest-dom/jest-globals";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "../../test/helpers";
import GradeReport from "./GradeReport";
import { GradeReport as GradeReportData } from "../../apiTypes";
import { studentMessages } from "../../messages";

// Focused coverage of the report contract: server values verbatim, signed points,
// table semantics, the >8-row scroll region, the hidden host and the Restart gate.
const msg = (descriptor: { defaultMessage?: string }) => descriptor.defaultMessage ?? "";

const PASS_DETAILS = [
  { choice_text: "Message Dani directly and ask where the draft is.", awarded_points: 1 },
  { choice_text: "Tell Dani not to worry about it.", awarded_points: 2 },
  { choice_text: "Explain that you needed something ready.", awarded_points: 2 },
];

const FAIL_DETAILS = [
  { choice_text: "Message Dani directly and ask where the draft is.", awarded_points: 1 },
  { choice_text: "Tell Dani not to worry about it.", awarded_points: 0 },
  { choice_text: "Explain that you needed something ready.", awarded_points: 0 },
];

function makeReport(overrides: Partial<GradeReportData> = {}): GradeReportData {
  return {
    score: 5,
    max_score: 5,
    percentage: 100,
    grade_label: "Pass",
    is_pass_style: true,
    detailed_scores: PASS_DETAILS,
    ...overrides,
  };
}

function renderReport(
  reportData: GradeReportData = makeReport(),
  props: { showResetInReport?: boolean; hidden?: boolean; onReset?: () => void } = {},
) {
  const onReset = props.onReset ?? jest.fn();
  const utils = render(
    <GradeReport
      reportData={reportData}
      showResetInReport={props.showResetInReport ?? true}
      onReset={onReset}
      hidden={props.hidden ?? false}
    />,
  );
  return { ...utils, onReset };
}

const byRole = (container: HTMLElement, role: string) =>
  container.querySelector(`[data-role="${role}"]`) as HTMLElement;

describe("GradeReport", () => {
  it("renders the passing attempt with the server's values verbatim", () => {
    const { container } = renderReport();

    expect(byRole(container, "report-percent")).toHaveTextContent("100%");
    expect(byRole(container, "report-score").textContent).toBe("5");
    expect(byRole(container, "report-max-score").textContent).toBe("5");
    expect(byRole(container, "report-grade-label")).toHaveTextContent("Pass");
    expect(byRole(container, "report-grade-label")).toHaveClass("badge-success");
    expect(screen.getByRole("heading", { name: msg(studentMessages.activityComplete) })).toBeInTheDocument();
    expect(screen.getByText(msg(studentMessages.reportSubtitle))).toBeInTheDocument();
    expect(container.querySelector(".grade-report__metric")).toHaveClass("is-pass");
  });

  it("renders the failing attempt with the fail styling and danger badge", () => {
    const { container } = renderReport(
      makeReport({
        score: 1,
        max_score: 5,
        percentage: 43,
        grade_label: "Fail",
        is_pass_style: false,
        detailed_scores: FAIL_DETAILS,
      }),
    );

    expect(byRole(container, "report-percent").textContent).toBe("43%");
    expect(byRole(container, "report-score").textContent).toBe("1");
    expect(byRole(container, "report-max-score").textContent).toBe("5");
    expect(byRole(container, "report-grade-label")).toHaveClass("badge-danger");
    const scoreMetric = container.querySelector(".grade-report__metric");
    expect(scoreMetric).toHaveClass("is-fail");
    expect(container.querySelector(".grade-report__metric.is-max")).not.toBeNull();
  });

  it("shows a fractional percentage and scores without rounding or recalculating", () => {
    // 2.5/7.5 is 33.333...% but the server says 33.33: render the server's field.
    const { container } = renderReport(
      makeReport({ score: 2.5, max_score: 7.5, percentage: 33.33, grade_label: "Needs review", is_pass_style: false }),
    );

    expect(byRole(container, "report-percent").textContent).toBe("33.33%");
    expect(byRole(container, "report-score").textContent).toBe("2.5");
    expect(byRole(container, "report-max-score").textContent).toBe("7.5");
    expect(byRole(container, "report-grade-label")).toHaveTextContent("Needs review");
  });

  it("signs each row's points, keeping +0 and formatting negatives as -1", () => {
    const { container } = renderReport(
      makeReport({
        detailed_scores: [
          { choice_text: "Earned", awarded_points: 2 },
          { choice_text: "Nothing", awarded_points: 0 },
          { choice_text: "Penalty", awarded_points: -1 },
        ],
      }),
    );

    const scores = Array.from(container.querySelectorAll(".grade-report__details-score")).map(
      (cell) => cell.textContent,
    );
    expect(scores).toEqual(["+2", "+0", "-1"]);
  });

  it("shows +0 for a malformed row whose points are missing", () => {
    // The server shape is authoritative; this only pins the row-level null guard.
    const malformedRow = {
      choice_text: "Broken row",
      awarded_points: null,
    } as unknown as GradeReportData["detailed_scores"][number];
    const { container } = renderReport(makeReport({ detailed_scores: [malformedRow] }));

    expect(container.querySelector(".grade-report__details-score")?.textContent).toBe("+0");
  });

  it("builds a real table named by the details heading, with column and row headers", () => {
    const { container } = renderReport(makeReport({ detailed_scores: FAIL_DETAILS }));
    const table = screen.getByRole("table", { name: msg(studentMessages.detailedScore) });

    const columnHeaders = within(table).getAllByRole("columnheader");
    expect(columnHeaders.map((th) => th.textContent)).toEqual([
      msg(studentMessages.yourSelections),
      msg(studentMessages.scoreColumn),
    ]);
    expect(columnHeaders.every((th) => th.getAttribute("scope") === "col")).toBe(true);

    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(FAIL_DETAILS.length);
    expect(rowHeaders.every((th) => th.getAttribute("scope") === "row")).toBe(true);
    expect(rowHeaders[0]).toHaveTextContent(FAIL_DETAILS[0].choice_text);

    expect(byRole(container, "report-details").querySelectorAll("tr")).toHaveLength(FAIL_DETAILS.length);
  });

  it("falls back to an untitled label for a blank selection", () => {
    renderReport(makeReport({ detailed_scores: [{ choice_text: "   ", awarded_points: 1 }] }));

    expect(screen.getByRole("rowheader")).toHaveTextContent(msg(studentMessages.untitledChoice));
  });

  it("renders a full-width empty state when there are no scored selections", () => {
    const { container } = renderReport(makeReport({ detailed_scores: [] }));
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const emptyCell = rows[rows.length - 1].querySelector("td") as HTMLTableCellElement;

    expect(emptyCell).toHaveAttribute("colspan", "2");
    expect(emptyCell).toHaveTextContent(msg(studentMessages.noScoredSelections));
    expect(within(table).queryAllByRole("rowheader")).toHaveLength(0);
    expect(container.querySelector(".grade-report__table-scroll")).not.toHaveClass("is-scrollable");
  });

  it("names and focuses the details region only when a ninth row makes it scroll", () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ choice_text: `Selection ${i + 1}`, awarded_points: 1 }));

    const { container: eight } = renderReport(makeReport({ detailed_scores: rows(8) }));
    expect(eight.querySelector(".grade-report__table-scroll")).not.toHaveClass("is-scrollable");
    expect(within(eight).queryByRole("region")).toBeNull();

    const { container: nine } = renderReport(makeReport({ detailed_scores: rows(9) }));
    const region = within(nine).getByRole("region", { name: msg(studentMessages.detailedScore) });
    expect(region).toHaveClass("grade-report__table-scroll");
    expect(region).toHaveClass("is-scrollable");
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.querySelector("table")).not.toBeNull();
  });

  it("offers Restart only when the report reset gate is open, and calls onReset", () => {
    const closed = renderReport(makeReport(), { showResetInReport: false });
    expect(closed.container.querySelector('[data-role="reset-activity-report"]')).toBeNull();

    const { container, onReset } = renderReport(makeReport(), { showResetInReport: true });
    const restart = byRole(container, "reset-activity-report");
    expect(restart).toHaveClass("grade-report__restart");
    // Label comes from studentMessages.restart (added with the report layout).
    expect(restart).toHaveTextContent("Restart");

    fireEvent.click(restart);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("carries the same localized scenario header as the scenario, with no reset control", () => {
    const { container } = renderReport();
    const titleText = msg(studentMessages.scenarioTitle);

    const heading = screen.getByRole("heading", { level: 2, name: titleText });
    expect(heading).toHaveClass("branching-scenario__title-text");
    expect(screen.getAllByRole("heading", { level: 2, name: titleText })).toHaveLength(1);

    const title = heading.parentElement as HTMLElement;
    // Paragon Stack owns the row and the gap, as it does on the scenario card.
    expect(title).toHaveClass("branching-scenario__title", "pgn__hstack", "pgn__stack-gap--3");
    expect(title.querySelectorAll(".branching-scenario__title-icon")).toHaveLength(1);
    const icon = title.querySelector(".branching-scenario__title-icon") as HTMLElement;
    expect(icon).toHaveClass("flex-shrink-0");
    const divider = title.querySelector(".branching-scenario__title-divider") as HTMLElement;
    expect(divider).toHaveAttribute("aria-hidden", "true");

    // No reset action in the header: Restart is the report's only reset entry point.
    expect(within(title).queryAllByRole("button")).toHaveLength(0);
    // The header is part of the report card, which is a separate card from the scenario.
    expect(container.querySelector('[data-role="grade-report"] .pgn__card-header')).not.toBeNull();
  });

  it("keeps every report icon decorative so none adds or duplicates an accessible name", () => {
    const { container } = renderReport();

    const sparkle = container.querySelector(".grade-report__sparkle") as HTMLElement;
    const restartIcon = container.querySelector(".grade-report__restart-icon") as HTMLElement;
    expect(sparkle).not.toBeNull();
    expect(restartIcon).not.toBeNull();

    const iconSvgs = [
      container.querySelector(".branching-scenario__title-icon svg"),
      sparkle.querySelector("svg"),
      restartIcon.querySelector("svg"),
    ] as SVGElement[];
    for (const svg of iconSvgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.hasAttribute("aria-label")).toBe(false);
    }
    // Decorative icons expose no images, and the Restart button keeps its one label.
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    const restart = screen.getByRole("button", { name: msg(studentMessages.restart) });
    expect(restart).toContainElement(restartIcon);
  });

  it("labels the score strips with a single colon", () => {
    renderReport();

    // The colon is rendered by the component, so the message default must stay colon-free.
    expect(screen.getByText("Your Score:")).toBeInTheDocument();
    expect(screen.getByText("Highest Possible Score:")).toBeInTheDocument();
  });

  it("renders only a hidden host when hidden", () => {
    const { container } = renderReport(makeReport(), { hidden: true });
    const host = byRole(container, "grade-report");

    expect(host).toHaveAttribute("hidden");
    expect(host).toHaveClass("grade-report");
    expect(host.children).toHaveLength(0);
    expect(screen.queryByRole("table")).toBeNull();
    expect(container.querySelector('[data-role="report-score"]')).toBeNull();
    expect(container.querySelector('[data-role="reset-activity-report"]')).toBeNull();
  });
});
