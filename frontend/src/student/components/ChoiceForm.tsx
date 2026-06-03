import React, { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";
import ChoiceOption from "./ChoiceOption";

interface ChoiceFormProps {
  choices: Choice[];
  nodeId: string;
  onSubmit: (choiceIndex: number) => void;
}

const ChoiceForm: React.FC<ChoiceFormProps> = ({ choices, nodeId, onSubmit }) => {
  const intl = useIntl();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasChoices = choices.length > 0;

  useEffect(() => {
    setSelectedIndex(null);
  }, [nodeId]);

  return (
    <div className="choices" data-role="choices">
      <h3 className="choices-heading" data-role="choice-heading" style={{ display: hasChoices ? undefined : "none" }}>
        {intl.formatMessage(studentMessages.chooseNextStep)}
      </h3>
      <form
        className="choices-form"
        data-role="choice-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedIndex !== null) {
            onSubmit(selectedIndex);
          }
        }}
      >
        <div className="choices-list" data-role="choice-list">
          {choices.map((choice, idx) => (
            <ChoiceOption
              key={`${nodeId}-${idx}`}
              choice={choice}
              index={idx}
              nodeId={nodeId}
              isSelected={selectedIndex === idx}
              onChange={setSelectedIndex}
            />
          ))}
        </div>
        {hasChoices && (
          <button
            type="submit"
            className="choice-submit-button action-primary btn-primary"
            data-role="submit-choice"
            disabled={selectedIndex === null}
          >
            {intl.formatMessage(studentMessages.submit)}
          </button>
        )}
      </form>
    </div>
  );
};

export default ChoiceForm;
