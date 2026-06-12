import React from "react";
import Button from "@openedx/paragon/dist/Button";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";

interface ActionButtonsProps {
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
        <Button
          type="button"
          variant="outline-primary"
          className={`undo-button action-secondary btn-secondary${!canUndo ? " is-disabled" : ""}`}
          data-role="undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          {intl.formatMessage(studentMessages.goBack)}
        </Button>
        {showReset && (
          <Button
            type="button"
            variant="outline-primary"
            className="reset-button action-secondary btn-secondary"
            data-role="reset-activity"
            onClick={onReset}
          >
            {intl.formatMessage(studentMessages.reset)}
          </Button>
        )}
      </div>
      <div className="choice-actions__primary">
        {showReport && (
          <Button
            type="button"
            variant="primary"
            className="show-report-button action-primary btn-primary"
            data-role="show-report"
            onClick={onShowReport}
          >
            {intl.formatMessage(studentMessages.showReport)}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
