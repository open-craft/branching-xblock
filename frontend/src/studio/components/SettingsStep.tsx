import React from "react";
import { useIntl } from "react-intl";
import { studioMessages } from "../../messages";
import { DraftSettings } from "../reducer";
import { ValidationState } from "../reducer";

interface SettingsStepProps {
  settings: DraftSettings;
  validation: ValidationState;
  authoringHelpHtml: string;
  onUpdateField: (field: string, value: unknown) => void;
}

const SettingsStep: React.FC<SettingsStepProps> = ({
  settings,
  validation,
  authoringHelpHtml,
  onUpdateField,
}) => {
  const intl = useIntl();

  return (
    <div className="bx-wizard bx-settings-step">
      <h2 className="bx-step-title">
        {intl.formatMessage(studioMessages.settings)}
      </h2>

      {authoringHelpHtml && (
        <div
          className="bx-help bx-authoring-help"
          data-role="authoring-help"
          dangerouslySetInnerHTML={{ __html: authoringHelpHtml }}
        />
      )}

      <label className="bx-field">
        <div className="bx-field__label">
          {intl.formatMessage(studioMessages.displayName)}
        </div>
        <input
          type="text"
          name="display_name"
          className="bx-input"
          value={settings.display_name}
          onChange={(e) => onUpdateField("display_name", e.target.value)}
        />
      </label>

      <label className="bx-checkbox">
        <input
          type="checkbox"
          name="enable_undo"
          checked={settings.enable_undo}
          onChange={(e) => onUpdateField("enable_undo", e.target.checked)}
        />
        <span>{intl.formatMessage(studioMessages.enableUndo)}</span>
      </label>

      <label className="bx-checkbox">
        <input
          type="checkbox"
          name="enable_reset_activity"
          checked={settings.enable_reset_activity}
          onChange={(e) => onUpdateField("enable_reset_activity", e.target.checked)}
        />
        <span>{intl.formatMessage(studioMessages.enableResetActivity)}</span>
      </label>

      <label className="bx-checkbox">
        <input
          type="checkbox"
          name="enable_scoring"
          checked={settings.enable_scoring}
          onChange={(e) => onUpdateField("enable_scoring", e.target.checked)}
        />
        <span>{intl.formatMessage(studioMessages.enableScoring)}</span>
      </label>

      <div className={`bx-grade-range${settings.enable_scoring ? "" : " is-hidden"}`} data-role="grade-range-section">
        <h3 className="bx-section-title bx-grade-range__title">
          {intl.formatMessage(studioMessages.specifyGradeRange)}
        </h3>
        <p className="bx-help bx-grade-range__help">
          {intl.formatMessage(studioMessages.gradeRangeHelp)}
        </p>
        <div className="bx-grade-range__slider" data-role="grade-range-slider" />
        {validation.settingsFieldErrors.grade_ranges && (
          <div className="bx-field-error">{validation.settingsFieldErrors.grade_ranges}</div>
        )}
      </div>

      <h3 className="bx-section-title">
        {intl.formatMessage(studioMessages.backgroundImage)}
      </h3>
      <p className="bx-help">
        {intl.formatMessage(studioMessages.backgroundImageHelp)}
      </p>

      <label className="bx-field">
        <div className="bx-field__label">
          {intl.formatMessage(studioMessages.imageUrl)}
        </div>
        <input
          type="text"
          name="background_image_url"
          className={`bx-input${validation.settingsFieldErrors.background_image_url ? " is-error" : ""}`}
          placeholder={intl.formatMessage(studioMessages.urlPlaceholder)}
          value={settings.background_image_url}
          onChange={(e) => onUpdateField("background_image_url", e.target.value)}
        />
        {validation.settingsFieldErrors.background_image_url && (
          <div className="bx-field-error">{validation.settingsFieldErrors.background_image_url}</div>
        )}
      </label>

      <div className="bx-field">
        <div className="bx-field__label">
          {intl.formatMessage(studioMessages.altText)}
        </div>
        <label className="bx-checkbox bx-checkbox--nested">
          <input
            type="checkbox"
            name="background_image_is_decorative"
            checked={settings.background_image_is_decorative}
            onChange={(e) => onUpdateField("background_image_is_decorative", e.target.checked)}
          />
          <span>{intl.formatMessage(studioMessages.decorativeImage)}</span>
        </label>
        <input
          type="text"
          name="background_image_alt_text"
          className={`bx-input${validation.settingsFieldErrors.background_image_alt_text ? " is-error" : ""}`}
          placeholder={intl.formatMessage(studioMessages.altText)}
          value={settings.background_image_alt_text}
          disabled={settings.background_image_is_decorative}
          onChange={(e) => onUpdateField("background_image_alt_text", e.target.value)}
        />
        {validation.settingsFieldErrors.background_image_alt_text && (
          <div className="bx-field-error">{validation.settingsFieldErrors.background_image_alt_text}</div>
        )}
      </div>
    </div>
  );
};

export default SettingsStep;
