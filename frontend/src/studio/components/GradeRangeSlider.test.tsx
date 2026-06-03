import React from "react";
import { render, screen, fireEvent } from "../../test/helpers";
import GradeRangeSlider from "./GradeRangeSlider";

const defaultRanges = [
  { label: "Fail", start: 0, end: 49 },
  { label: "Pass", start: 50, end: 100 },
];

describe("GradeRangeSlider", () => {
  it("renders fail and pass segments", () => {
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={jest.fn()} />);
    expect(screen.getByText("Fail")).toBeInTheDocument();
    expect(screen.getByText("Pass")).toBeInTheDocument();
  });

  it("renders tick marks from 0 to 100", () => {
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={jest.fn()} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders boundary handle with correct ARIA attributes", () => {
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={jest.fn()} />);
    const handle = screen.getByRole("slider");
    expect(handle).toHaveAttribute("aria-valuemin");
    expect(handle).toHaveAttribute("aria-valuemax");
    expect(handle).toHaveAttribute("aria-valuenow", "49");
  });

  it("moves boundary left on ArrowLeft key", () => {
    const onChange = jest.fn();
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={onChange} />);
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalled();
    const newRanges = onChange.mock.calls[0][0];
    expect(newRanges[0].end).toBe(48);
    expect(newRanges[1].start).toBe(49);
  });

  it("moves boundary right on ArrowRight key", () => {
    const onChange = jest.fn();
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={onChange} />);
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalled();
    const newRanges = onChange.mock.calls[0][0];
    expect(newRanges[0].end).toBe(50);
    expect(newRanges[1].start).toBe(51);
  });

  it("moves boundary to lower bound on Home key", () => {
    const onChange = jest.fn();
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={onChange} />);
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "Home" });
    const newRanges = onChange.mock.calls[0][0];
    expect(newRanges[0].end).toBe(0);
  });

  it("clamps to upper bound (99)", () => {
    const onChange = jest.fn();
    render(<GradeRangeSlider gradeRanges={defaultRanges} onChange={onChange} />);
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "End" });
    const newRanges = onChange.mock.calls[0][0];
    expect(newRanges[0].end).toBe(99);
  });

  it("returns null for less than 2 ranges", () => {
    const { container } = render(
      <GradeRangeSlider gradeRanges={[{ label: "Only", start: 0, end: 100 }]} onChange={jest.fn()} />
    );
    expect(container.querySelector(".bx-grade-range__track")).toBeNull();
  });
});
