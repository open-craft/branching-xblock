import React from "react";
import Button from "@openedx/paragon/dist/Button";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";

interface ActionBarProps {
  currentStep: "settings" | "nodes";
  pendingDeleteCount: number;
  hasValidationErrors: boolean;
  saveErrorMessage: string | null;
  isSaving: boolean;
  onContinue: () => void;
  onBack: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  currentStep,
  pendingDeleteCount,
  hasValidationErrors,
  saveErrorMessage,
  isSaving,
  onContinue,
  onBack,
  onSave,
  onCancel,
}) => {
  const intl = useIntl();
  const isSettings = currentStep === "settings";
  const showPendingSummary = !isSettings && pendingDeleteCount > 0 && !hasValidationErrors;

  return (
    <div className="xblock-actions">
      {isSettings && (
        <Button type="button" variant="primary" className="action-primary" data-role="continue" onClick={onContinue}>
          {intl.formatMessage(studioMessages.continue)}
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        className="action-primary"
        data-role="save"
        hidden={isSettings}
        disabled={isSaving}
        onClick={onSave}
      >
        {isSaving
          ? intl.formatMessage(studioMessages.saving)
          : intl.formatMessage(studioMessages.save)}
      </Button>
      <Button
        type="button"
        variant="outline-primary"
        className="action-secondary"
        data-role="back"
        hidden={isSettings}
        onClick={onBack}
      >
        {intl.formatMessage(studioMessages.back)}
      </Button>
      <Button type="button" variant="outline-primary" className="action-secondary" data-role="cancel" onClick={onCancel}>
        {intl.formatMessage(studioMessages.cancel)}
      </Button>
      {(hasValidationErrors || saveErrorMessage) && (
        <div className="xblock-actions__error" data-role="save-validation-summary">
          {saveErrorMessage || intl.formatMessage(studioMessages.saveValidationError)}
        </div>
      )}
      {showPendingSummary && (
        <div className="xblock-actions__warning" data-role="pending-delete-summary">
          {intl.formatMessage(studioMessages.pendingDeleteSummary, { count: pendingDeleteCount })}
        </div>
      )}
    </div>
  );
};

export default ActionBar;
