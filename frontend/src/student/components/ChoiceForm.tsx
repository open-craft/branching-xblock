import React, { useEffect, useState } from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
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
      <h3 id={`choice-heading-${nodeId}`} className="choices-heading" data-role="choice-heading" style={{ display: hasChoices ? undefined : "none" }}>
        {intl.formatMessage(studentMessages.chooseNextStep)}
      </h3>
      <Form
        className="choices-form"
        data-role="choice-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedIndex !== null) {
            onSubmit(selectedIndex);
          }
        }}
      >
        <div className="choices-list" data-role="choice-list" role="radiogroup" aria-labelledby={`choice-heading-${nodeId}`}>
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
          <Button
            type="submit"
            variant="primary"
            className="choice-submit-button action-primary btn-primary"
            data-role="submit-choice"
            disabled={selectedIndex === null}
          >
            {intl.formatMessage(studentMessages.submit)}
          </Button>
        )}
      </Form>
    </div>
  );
};

export default ChoiceForm;
