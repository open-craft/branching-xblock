import React from "react";
import { FormattedMessage } from "react-intl";
import Stack from "@openedx/paragon/dist/Stack";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";
import ChoiceOption from "./ChoiceOption";

interface ChoiceFormProps {
  choices: Choice[];
  nodeId: string;
  /** Selection lives in StudentApp so Submit can sit in the shared action row. */
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const ChoiceForm: React.FC<ChoiceFormProps> = ({ choices, nodeId, selectedIndex, onSelect }) => {
  const headingId = `choice-heading-${nodeId || "node"}`;

  return (
    <fieldset className="branching-scenario__choices m-0 p-0 border-0" data-role="choices">
      <legend
        className="branching-scenario__choices-legend d-block w-auto p-0"
        id={headingId}
        data-role="choice-heading"
      >
        <FormattedMessage {...studentMessages.chooseNextStep} />
      </legend>
      <Stack
        gap={3}
        className="branching-scenario__choice-list"
        data-role="choice-list"
        role="radiogroup"
        aria-labelledby={headingId}
      >
        {choices.map((choice, idx) => (
          <ChoiceOption
            key={`${nodeId}-${idx}`}
            choice={choice}
            index={idx}
            nodeId={nodeId}
            isSelected={selectedIndex === idx}
            onChange={onSelect}
          />
        ))}
      </Stack>
    </fieldset>
  );
};

export default ChoiceForm;
