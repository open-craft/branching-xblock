import React from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { DraftChoice } from "../reducer";

interface ChoiceRowProps {
  choice: DraftChoice;
  index: number;
  nodeOptions: Array<{ id: string; label: string }>;
  destinationError: string;
  scoreError: string;
  onChange: (choiceIndex: number, field: string, value: unknown) => void;
  onDelete: (choiceIndex: number) => void;
}

const ChoiceRow: React.FC<ChoiceRowProps> = ({
  choice,
  index,
  nodeOptions,
  destinationError,
  scoreError,
  onChange,
  onDelete,
}) => {
  const intl = useIntl();

  return (
    <div className="choice-row" data-choice-idx={index}>
      <div className="choice-col choice-col--text">
        <Form.Label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceText)}
        </Form.Label>
        <Form.Control
          className="choice-text"
          value={choice.text}
          placeholder={intl.formatMessage(studioMessages.choiceTextPlaceholder)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, "text", e.target.value)}
        />
      </div>
      <div className="choice-col choice-col--score">
        <Form.Label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceScore)}
        </Form.Label>
        <Form.Control
          className={`choice-score${scoreError ? " is-error" : ""}`}
          type="number"
          min="0"
          max="100"
          step="1"
          value={choice.score}
          placeholder="0"
          aria-label={intl.formatMessage(studioMessages.choiceScoreAriaLabel)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, "score", e.target.value)}
        />
        {scoreError && <div className="choice-field-error">{scoreError}</div>}
      </div>
      <div className="choice-col choice-col--target">
        <Form.Label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceDestination)}
        </Form.Label>
        <Form.Control
          as="select"
          className={`choice-target${destinationError ? " is-error" : ""}`}
          value={choice.target_node_id}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(index, "target_node_id", e.target.value)}
        >
          <option value="">
            {intl.formatMessage(studioMessages.selectNode)}
          </option>
          {nodeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Form.Control>
        {destinationError && <div className="choice-field-error">{destinationError}</div>}
      </div>
      <Button
        type="button"
        variant="link"
        className="btn-delete-choice"
        aria-label={intl.formatMessage(studioMessages.deleteChoice)}
        onClick={() => onDelete(index)}
      >
        ×
      </Button>
    </div>
  );
};

export default ChoiceRow;
