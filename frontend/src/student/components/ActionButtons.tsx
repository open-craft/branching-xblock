import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";

interface ActionButtonsProps {
  enableUndo: boolean;
  canUndo: boolean;
  showReset: boolean;
  showReport: boolean;
  hasChoices: boolean;
  onUndo: () => void;
  onReset: () => void;
  onShowReport: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  canUndo,
  showReset,
  showReport,
  hasChoices,
  onUndo,
  onReset,
  onShowReport,
}) => {
  const intl = useIntl();
  const showActions = hasChoices || canUndo || showReset || showReport;

  return (
    <div className="choice-actions" style={{ display: showActions ? "flex" : "none" }}>
      <div className="choice-actions__secondary">
        <button
          type="button"
          className={`undo-button action-secondary btn-secondary${!canUndo ? " is-disabled" : ""}`}
          data-role="undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          {intl.formatMessage(studentMessages.goBack)}
        </button>
        {showReset && (
          <button
            type="button"
            className="reset-button action-secondary btn-secondary"
            data-role="reset-activity"
            onClick={onReset}
          >
            {intl.formatMessage(studentMessages.reset)}
          </button>
        )}
      </div>
      <div className="choice-actions__primary">
        {showReport && (
          <button
            type="button"
            className="show-report-button action-primary btn-primary"
            data-role="show-report"
            onClick={onShowReport}
          >
            {intl.formatMessage(studentMessages.showReport)}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
