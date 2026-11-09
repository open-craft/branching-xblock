import React from "react";
import Button from "@openedx/paragon/dist/Button";
import Icon from "@openedx/paragon/dist/Icon";
import Stack from "@openedx/paragon/dist/Stack";
// Deep imports, not the icons barrel: each es5 module is a default export.
import ArrowBack from "@openedx/paragon/icons/es5/ArrowBack";
import ArrowForward from "@openedx/paragon/icons/es5/ArrowForward";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";

interface ActionButtonsProps {
  /** Id of the choice form Submit belongs to; the button itself lives in the footer. */
  submitFormId: string;
  /** Submit is the primary action for an option node. */
  showSubmit: boolean;
  canSubmit: boolean;
  /** Go Back is absent at the first step: there is nowhere to go. */
  showGoBack: boolean;
  canUndo: boolean;
  showReportButton: boolean;
  onUndo: () => void;
  onShowReport: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  submitFormId,
  showSubmit,
  canSubmit,
  showGoBack,
  canUndo,
  showReportButton,
  onUndo,
  onShowReport,
}) => {
  const intl = useIntl();

  if (!showSubmit && !showGoBack && !showReportButton) {
    return null;
  }

  // DOM order is primary then secondary, so the stacked phone order and the Tab order agree.
  // The 768 container query in the block CSS reverses the row (Back left, primary right).
  return (
    <Stack gap={2.5} className="branching-scenario__actions flex-wrap mt-4.5" data-role="actions">
      {showSubmit && (
        <Button
          type="submit"
          form={submitFormId}
          variant="primary"
          className="branching-scenario__action"
          data-role="submit-choice"
          disabled={!canSubmit}
        >
          {intl.formatMessage(studentMessages.submit)}
          <Icon src={ArrowForward} className="flex-shrink-0" />
        </Button>
      )}
      {showReportButton && (
        <Button
          type="button"
          variant="primary"
          className="branching-scenario__action"
          data-role="show-report"
          onClick={onShowReport}
        >
          {intl.formatMessage(studentMessages.showReport)}
        </Button>
      )}
      {showGoBack && (
        <Button
          type="button"
          variant="outline-primary"
          className="branching-scenario__action"
          data-role="undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Icon src={ArrowBack} className="flex-shrink-0" />
          {intl.formatMessage(studentMessages.goBack)}
        </Button>
      )}
    </Stack>
  );
};

export default ActionButtons;
