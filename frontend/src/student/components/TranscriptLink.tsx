import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";

interface TranscriptLinkProps {
  url: string;
}

const TranscriptLink: React.FC<TranscriptLinkProps> = ({ url }) => {
  const intl = useIntl();
  if (!url) {
    return <div className="transcript-link" data-role="transcript" hidden />;
  }
  return (
    <div className="transcript-link" data-role="transcript">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {intl.formatMessage(studentMessages.downloadTranscript)}
      </a>
    </div>
  );
};

export default TranscriptLink;
