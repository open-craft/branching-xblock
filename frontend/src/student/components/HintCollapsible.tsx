import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";

interface HintCollapsibleProps {
  hintText: string;
  nodeId: string | null;
}

const HintCollapsible: React.FC<HintCollapsibleProps> = ({ hintText, nodeId }) => {
  const intl = useIntl();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
  }, [nodeId]);

  const showHintLabel = intl.formatMessage(studentMessages.showHint);
  const hideHintLabel = intl.formatMessage(studentMessages.hideHint);
  const hintPrefix = intl.formatMessage(studentMessages.hintPrefix);

  if (!hintText) {
    return (
      <div className="node-hint-container" data-role="hint-container">
        <details className="hint-collapsible" data-role="hint-collapsible" hidden>
          <summary className="hint-summary" data-role="hint-summary">{showHintLabel}</summary>
          <div data-role="hint" className="node-hint px-2 py-3" />
        </details>
      </div>
    );
  }

  return (
    <div className="node-hint-container" data-role="hint-container">
      <details
        className="hint-collapsible"
        data-role="hint-collapsible"
        open={isVisible}
        onToggle={(e) => setIsVisible(e.currentTarget.open)}
      >
        <summary className="hint-summary" data-role="hint-summary">
          {isVisible ? hideHintLabel : showHintLabel}
        </summary>
        <div
          data-role="hint"
          className="node-hint px-2 py-3"
          dangerouslySetInnerHTML={{ __html: `<strong>${hintPrefix}</strong> ${hintText}` }}
        />
      </details>
    </div>
  );
};

export default HintCollapsible;
