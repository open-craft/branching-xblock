import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "../../test/helpers";
import ChoiceForm from "./ChoiceForm";

const firstNodeChoices = [
  { text: "Go left", target_node_id: "node-2", score: 0 },
  { text: "Go right", target_node_id: "node-3", score: 0 },
];

const secondNodeChoices = [
  { text: "Continue", target_node_id: "node-4", score: 0 },
  { text: "Stop", target_node_id: "node-5", score: 0 },
];

describe("ChoiceForm", () => {
  it("reports the chosen index and reflects the selected option", () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" selectedIndex={null} onSelect={onSelect} />
    );

    expect((screen.getByLabelText("Go left") as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByLabelText("Go left"));
    expect(onSelect).toHaveBeenCalledWith(0);

    rerender(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" selectedIndex={0} onSelect={onSelect} />
    );
    expect((screen.getByLabelText("Go left") as HTMLInputElement).checked).toBe(true);
  });

  it("keeps the radio group labelled, and the new node's choices unchecked", () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" selectedIndex={1} onSelect={onSelect} />
    );

    expect(screen.getByRole("radiogroup", { name: "Choose Next Step:" })).toBeTruthy();

    // Selection is owned by StudentApp, which clears it on a node change, so the new
    // node arrives with selectedIndex null and no option checked.
    rerender(
      <ChoiceForm choices={secondNodeChoices} nodeId="node-2" selectedIndex={null} onSelect={onSelect} />
    );

    expect((screen.getByLabelText("Continue") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Stop") as HTMLInputElement).checked).toBe(false);
  });
});
