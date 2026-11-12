import React from "react";
import Form from "@openedx/paragon/dist/Form";
import { FormattedMessage } from "react-intl";
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
  const choiceId = `choice-${nodeId || "node"}-${index}`;
  return (
    <Form.Radio
      className={`branching-scenario__choice m-0${isSelected ? " is-selected" : ""}`}
      controlClassName="branching-scenario__choice-input"
      labelClassName="branching-scenario__choice-text"
      name="branching-choice"
      id={choiceId}
      value={index}
      checked={isSelected}
      onChange={() => onChange(index)}
    >
      {choice.text || (
        <FormattedMessage {...studentMessages.choiceLabel} values={{ index: index + 1 }} />
      )}
    </Form.Radio>
  );
};

export default ChoiceOption;
