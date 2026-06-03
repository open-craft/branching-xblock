import React from "react";
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
        <label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceText)}
        </label>
        <input
          className="choice-text"
          value={choice.text}
          placeholder={intl.formatMessage(studioMessages.choiceTextPlaceholder)}
          onChange={(e) => onChange(index, "text", e.target.value)}
        />
      </div>
      <div className="choice-col choice-col--score">
        <label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceScore)}
        </label>
        <input
          className={`choice-score${scoreError ? " is-error" : ""}`}
          type="number"
          min="0"
          max="100"
          step="1"
          value={choice.score}
          placeholder="0"
          aria-label={intl.formatMessage(studioMessages.choiceScoreAriaLabel)}
          onChange={(e) => onChange(index, "score", e.target.value)}
        />
        {scoreError && <div className="choice-field-error">{scoreError}</div>}
      </div>
      <div className="choice-col choice-col--target">
        <label className="choice-col__label">
          {intl.formatMessage(studioMessages.choiceDestination)}
        </label>
        <select
          className={`choice-target${destinationError ? " is-error" : ""}`}
          value={choice.target_node_id}
          onChange={(e) => onChange(index, "target_node_id", e.target.value)}
        >
          <option value="">
            {intl.formatMessage(studioMessages.selectNode)}
          </option>
          {nodeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {destinationError && <div className="choice-field-error">{destinationError}</div>}
      </div>
      <button
        type="button"
        className="btn-delete-choice"
        aria-label={intl.formatMessage(studioMessages.deleteChoice)}
        onClick={() => onDelete(index)}
      >
        ×
      </button>
    </div>
  );
};

export default ChoiceRow;
