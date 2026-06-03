import React from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
import Spinner from "@openedx/paragon/dist/Spinner";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";

interface ImportModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  error: string;
  hasFile: boolean;
  onClose: () => void;
  onFileSelected: (fileContent: unknown) => void;
  onFileError: (error: string) => void;
  onConfirm: () => void;
  onRefresh: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  isLoading,
  isSuccess,
  error,
  hasFile,
  onClose,
  onFileSelected,
  onFileError,
  onConfirm,
  onRefresh,
}) => {
  const intl = useIntl();

  if (!isOpen) {
    return (
      <div className="bx-modal-overlay" data-role="import-modal-overlay" hidden>
        <div className="bx-modal" data-role="import-modal" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bx-modal-overlay" data-role="import-modal-overlay">
        <div className="bx-modal" data-role="import-modal">
          <div className="bx-modal-success">
            <div className="bx-modal-success-header">
              <span className="bx-modal-success-icon">✅</span>
              <h3 className="bx-modal-title bx-modal-title--success">
                {intl.formatMessage(studioMessages.importSuccess)}
              </h3>
            </div>
            <p className="bx-modal-body">
              {intl.formatMessage(studioMessages.importRefreshMessage)}
            </p>
            <div className="bx-modal-actions">
              <Button type="button" variant="success" className="bx-btn bx-btn--success" data-role="refresh-page" onClick={onRefresh}>
                {intl.formatMessage(studioMessages.refreshPage)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bx-modal-overlay" data-role="import-modal-overlay" onClick={(e) => {
      if ((e.target as HTMLElement).getAttribute("data-role") === "import-modal-overlay") {
        onClose();
      }
    }}>
      <div className="bx-modal" data-role="import-modal">
        <h3 className="bx-modal-title">
          {intl.formatMessage(studioMessages.importNodes)}
        </h3>
        <p className="bx-modal-body">
          {intl.formatMessage(studioMessages.importWarning)}
        </p>
        <Form.Group className="bx-modal-field">
          <Form.Label className="bx-modal-label">
            {intl.formatMessage(studioMessages.uploadJsonFile)}
          </Form.Label>
          <Form.Control
            type="file"
            accept=".json"
            data-role="import-file-input"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                  try {
                    const parsed = JSON.parse(evt.target?.result as string);
                    onFileSelected(parsed);
                  } catch {
                    onFileError(intl.formatMessage(studioMessages.invalidJsonError));
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
        </Form.Group>
        {error && <div className="bx-modal-error">{error}</div>}
        <div className="bx-modal-actions">
          <Button type="button" variant="link" className="bx-btn bx-btn--text" data-role="import-cancel" onClick={onClose}>
            {intl.formatMessage(studioMessages.cancel)}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="bx-btn bx-btn--primary"
            data-role="import-confirm"
            disabled={!hasFile || isLoading}
            onClick={onConfirm}
          >
            {isLoading ? (
              <>
                {intl.formatMessage(studioMessages.importNodes)}{" "}
                <Spinner animation="border" size="sm" className="bx-spinner" screenReaderText="" />
              </>
            ) : (
              intl.formatMessage(studioMessages.importNodes)
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
