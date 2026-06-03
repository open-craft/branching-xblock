import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";

interface ChoiceOptionProps {
  choice: Choice;
  index: number;
  nodeId: string;
  isSelected: boolean;
  onChange: (index: number) => void;
}

const ChoiceOption: React.FC<ChoiceOptionProps> = ({ choice, index, nodeId, isSelected, onChange }) => {
  const intl = useIntl();
  const choiceId = `choice-${nodeId || "node"}-${index}`;
  return (
    <label className={`choice-option${isSelected ? " is-selected" : ""}`} htmlFor={choiceId}>
      <input
        type="radio"
        className="choice-option__input"
        name="branching-choice"
        id={choiceId}
        value={index}
        checked={isSelected}
        onChange={() => onChange(index)}
      />
      <span className="choice-option__text">
        {choice.text || intl.formatMessage(studentMessages.choiceLabel, { index: index + 1 })}
      </span>
    </label>
  );
};

export default ChoiceOption;
