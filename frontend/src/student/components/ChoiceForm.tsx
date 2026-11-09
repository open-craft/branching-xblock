import React from "react";
import { useIntl } from "react-intl";
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
  const intl = useIntl();
  const headingId = `choice-heading-${nodeId || "node"}`;

  return (
    <fieldset className="branching-scenario__choices" data-role="choices">
      <legend
        className="branching-scenario__choices-legend"
        id={headingId}
        data-role="choice-heading"
      >
        {intl.formatMessage(studentMessages.chooseNextStep)}
      </legend>
      <div
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
      </div>
    </fieldset>
  );
};

export default ChoiceForm;
