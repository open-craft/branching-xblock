import React from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { DraftNode, ValidationState } from "../reducer";
import ChoiceRow from "./ChoiceRow";

interface NodeEditorProps {
  node: DraftNode;
  index: number;
  allNodes: DraftNode[];
  validation: ValidationState;
  onUpdateField: (nodeId: string, field: string, value: unknown) => void;
  onChangeChoice: (nodeId: string, choiceIndex: number, field: string, value: unknown) => void;
  onAddChoice: (nodeId: string) => void;
  onDeleteChoice: (nodeId: string, choiceIndex: number) => void;
  onSetMediaType: (nodeId: string, mediaType: string) => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  index,
  allNodes,
  validation,
  onUpdateField,
  onChangeChoice,
  onAddChoice,
  onDeleteChoice,
  onSetMediaType,
}) => {
  const intl = useIntl();
  const mediaType = node.media.type || "";
  const showMediaUrl = Boolean(mediaType) && mediaType !== "image";
  const showTranscript = mediaType === "audio" || mediaType === "video";
  const showOverlay = mediaType === "image";
  const hasChoices = Array.isArray(node.choices) && node.choices.length > 0;
  const noBranches = Boolean(node.no_branches) && !hasChoices;

  const nodeFieldErrors = validation.nodeFieldErrors[node.id] || {};
  const leftImageUrlError = (nodeFieldErrors.left_image_url as string) || "";
  const choiceDestinationErrors = (nodeFieldErrors.choiceDestinationByIndex as Record<string, string>) || {};
  const choiceScoreErrors = (nodeFieldErrors.choiceScoreByIndex as Record<string, string>) || {};

  const nodeOptions = allNodes
    .filter((n) => !n.pending_delete)
    .map((n, idx) => ({ id: n.id, label: intl.formatMessage(studioMessages.nodeLabel, { index: idx + 1 }) }))
    .filter((opt) => opt.id !== node.id);

  const hasNodeError = validation.nodeErrorIds.has(node.id);
  const nodeErrorTitle = validation.nodeErrorTitles[node.id] || "";
  const nodeErrorDetail = validation.nodeErrorDetails[node.id] || "";

  return (
    <div className="bx-node-editor-inner" data-node-id={node.id}>
      {nodeErrorDetail && (
        <div className="bx-node-error-banner" role="alert">
          <span className="fa fa-exclamation-circle bx-node-error-banner__icon" aria-hidden="true" />
          <div className="bx-node-error-banner__content">
            <div className="bx-node-error-banner__title">
              {nodeErrorTitle || intl.formatMessage(studioMessages.cannotDeleteNode)}
            </div>
            <div className="bx-node-error-banner__detail">{nodeErrorDetail}</div>
          </div>
        </div>
      )}

      <div className="bx-node-editor-header">
        <h2 className="bx-step-title">
          {intl.formatMessage(studioMessages.nodeLabel, { index: index + 1 })}
        </h2>
        {node.pending_delete && (
          <span className="bx-pending-delete-badge">
            {intl.formatMessage(studioMessages.pendingDeletion)}
          </span>
        )}
      </div>

      <Form.Group className="bx-field">
        <Form.Label className="bx-field__label">
          {intl.formatMessage(studioMessages.content)}
        </Form.Label>
        <Form.Control
          as="textarea"
          className="bx-textarea"
          data-role="node-content"
          value={node.content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdateField(node.id, "content", e.target.value)}
        />
      </Form.Group>

      <Form.Group className="bx-field">
        <Form.Label className="bx-field__label">
          {intl.formatMessage(studioMessages.media)}
        </Form.Label>
        <Form.Control
          as="select"
          className="bx-select"
          data-role="media-type"
          value={mediaType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSetMediaType(node.id, e.target.value)}
        >
          <option value="">
            {intl.formatMessage(studioMessages.mediaNone)}
          </option>
          <option value="image">
            {intl.formatMessage(studioMessages.mediaImage)}
          </option>
          <option value="video">
            {intl.formatMessage(studioMessages.mediaVideo)}
          </option>
          <option value="audio">
            {intl.formatMessage(studioMessages.mediaAudio)}
          </option>
        </Form.Control>
      </Form.Group>

      {/* Image URL fields — always visible, not gated by media type (bug fix) */}
      <div data-role="image-url-fields">
        <Form.Group className="bx-field">
          <Form.Label className="bx-field__label">
            {intl.formatMessage(studioMessages.leftImageUrl)}
          </Form.Label>
          <Form.Control
            type="text"
            className={`bx-input${leftImageUrlError ? " is-error" : ""}`}
            data-role="left-image-url"
            placeholder={intl.formatMessage(studioMessages.urlPlaceholder)}
            value={node.left_image_url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "left_image_url", e.target.value)}
          />
          {leftImageUrlError && <div className="bx-field-error">{leftImageUrlError}</div>}
        </Form.Group>
        <Form.Group className="bx-field">
          <Form.Label className="bx-field__label">
            {intl.formatMessage(studioMessages.leftImageAltText)}
          </Form.Label>
          <Form.Control
            type="text"
            className="bx-input"
            data-role="left-image-alt"
            placeholder={intl.formatMessage(studioMessages.altTextPlaceholder)}
            value={node.left_image_alt_text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "left_image_alt_text", e.target.value)}
          />
        </Form.Group>
        <Form.Group className="bx-field">
          <Form.Label className="bx-field__label">
            {intl.formatMessage(studioMessages.rightImageUrl)}
          </Form.Label>
          <Form.Control
            type="text"
            className="bx-input"
            data-role="right-image-url"
            placeholder={intl.formatMessage(studioMessages.urlPlaceholder)}
            value={node.right_image_url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "right_image_url", e.target.value)}
          />
        </Form.Group>
        <Form.Group className="bx-field">
          <Form.Label className="bx-field__label">
            {intl.formatMessage(studioMessages.rightImageAltText)}
          </Form.Label>
          <Form.Control
            type="text"
            className="bx-input"
            data-role="right-image-alt"
            placeholder={intl.formatMessage(studioMessages.altTextPlaceholder)}
            value={node.right_image_alt_text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "right_image_alt_text", e.target.value)}
          />
        </Form.Group>
      </div>

      <Form.Group className={`bx-field${showMediaUrl ? "" : " is-hidden"}`} data-role="media-url-field">
        <Form.Label className="bx-field__label">
          {intl.formatMessage(studioMessages.url)}
        </Form.Label>
        <Form.Control
          type="text"
          className="bx-input"
          data-role="media-url"
          placeholder={intl.formatMessage(studioMessages.urlPlaceholder)}
          value={node.media.url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "media", { ...node.media, url: e.target.value })}
        />
        <div className="bx-help">
          {intl.formatMessage(studioMessages.mediaUrlHelp)}
        </div>
      </Form.Group>

      <Form.Group className={`bx-field${showTranscript ? "" : " is-hidden"}`} data-role="transcript-url-field">
        <Form.Label className="bx-field__label">
          {intl.formatMessage(studioMessages.transcriptUrl)}
        </Form.Label>
        <Form.Control
          type="text"
          className="bx-input"
          data-role="transcript-url"
          placeholder="https://..."
          value={node.transcript_url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "transcript_url", e.target.value)}
        />
      </Form.Group>

      <div className={`overlay-text-control${showOverlay ? "" : " is-hidden"}`} data-role="overlay-text-control">
        <Form.Checkbox
          className="overlay-text-toggle overlay-text-checkbox"
          data-role="overlay-text"
          checked={node.overlay_text}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateField(node.id, "overlay_text", e.target.checked)}
        >
          {intl.formatMessage(studioMessages.overlayTextOnImage)}
        </Form.Checkbox>
        <p className="overlay-text-help">
          {intl.formatMessage(studioMessages.overlayTextHelp)}
        </p>
      </div>

      <Form.Checkbox
        className="bx-checkbox"
        data-role="no-branches"
        checked={node.no_branches}
        disabled={hasChoices}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onUpdateField(node.id, "no_branches", e.target.checked);
          if (e.target.checked) {
            // Clear choices when no_branches is checked
            onUpdateField(node.id, "choices", []);
          }
        }}
      >
        {intl.formatMessage(studioMessages.noBranches)}
      </Form.Checkbox>

      <Form.Group className="bx-field">
        <Form.Label className="bx-field__label">
          {intl.formatMessage(studioMessages.hint)}
        </Form.Label>
        <Form.Control
          as="textarea"
          className="bx-textarea"
          data-role="node-hint"
          value={node.hint}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdateField(node.id, "hint", e.target.value)}
        />
      </Form.Group>

      <div className={`bx-choices${noBranches ? " is-hidden" : ""}`} data-role="choices-section">
        <h3 className="bx-section-title">
          {intl.formatMessage(studioMessages.choices)}
        </h3>
        <div className="bx-help bx-choices-help">
          {intl.formatMessage(studioMessages.choicesHelp)}
        </div>
        <div className="choices-container" data-role="choices-container">
          {node.choices.map((choice, i) => (
            <ChoiceRow
              key={i}
              choice={choice}
              index={i}
              nodeOptions={nodeOptions}
              destinationError={choiceDestinationErrors[String(i)] || ""}
              scoreError={choiceScoreErrors[String(i)] || ""}
              onChange={(choiceIndex, field, value) => onChangeChoice(node.id, choiceIndex, field, value)}
              onDelete={(choiceIndex) => onDeleteChoice(node.id, choiceIndex)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline-primary"
          className="bx-btn bx-btn--secondary"
          data-role="add-choice"
          onClick={() => onAddChoice(node.id)}
        >
          {intl.formatMessage(studioMessages.addChoice)}
        </Button>
      </div>
    </div>
  );
};

export default NodeEditor;
