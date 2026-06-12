import React from "react";

interface ContentDisplayProps {
  contentHtml: string;
}

const ContentDisplay: React.FC<ContentDisplayProps> = ({ contentHtml }) => (
  <div className="node-content" data-role="content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
);

export default ContentDisplay;
