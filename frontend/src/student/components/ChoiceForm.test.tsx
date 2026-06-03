import React from "react";
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
  it("clears the selected choice when the node changes", () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByLabelText("Go left"));
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();

    rerender(
      <ChoiceForm choices={secondNodeChoices} nodeId="node-2" onSubmit={onSubmit} />
    );

    expect(screen.getByLabelText("Continue")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
});
