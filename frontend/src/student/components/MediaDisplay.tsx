import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Node } from "../../types";
import { normalizeEmbedUrl, isMediaFile } from "../mediaUtils";

interface MediaDisplayProps {
  node: Node;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  overlayEnabled: boolean;
  contentHtml: string;
}

function iframeHtml(src: string, title: string): string {
  return `<div class="bx-media-embed"><iframe src="${src}" title="${title}" allow="autoplay; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>`;
}

const MediaDisplay: React.FC<MediaDisplayProps> = ({
  node,
  background_image_url,
  background_image_alt_text,
  background_image_is_decorative,
  overlayEnabled,
  contentHtml,
}) => {
  const intl = useIntl();
  const embeddedMediaTitle = intl.formatMessage(studentMessages.embeddedMedia);

  const media = node.media || { type: "", url: "" };
  const mediaType = media.type;
  const mediaUrl = media.url || "";
  const hasImageComposite = Boolean(
    background_image_url || node.left_image_url || node.right_image_url
  );

  const renderImageComposite = () => {
    const hasForeground = Boolean(node.left_image_url || node.right_image_url);

    return (
      <div
        className={`bx-image-composite${
          !hasForeground && background_image_url ? " bx-image-composite--bg-only" : ""
        }`}
      >
        {background_image_url && (
          <img
            className="bx-image-composite__bg"
            src={background_image_url}
            alt={background_image_is_decorative ? "" : background_image_alt_text}
            {...(background_image_is_decorative ? { "aria-hidden": true } : {})}
          />
        )}
        {hasForeground && (
          <div className="bx-image-composite__fg">
            {node.left_image_url && (
              <img
                className="bx-image-composite__img bx-image-composite__img--left"
                src={node.left_image_url}
                alt={node.left_image_alt_text || ""}
              />
            )}
            {node.right_image_url && (
              <img
                className="bx-image-composite__img bx-image-composite__img--right"
                src={node.right_image_url}
                alt={node.right_image_alt_text || ""}
              />
            )}
          </div>
        )}
        {overlayEnabled && (
          <div
            className="media-overlay__text bx-image-composite__overlay"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        )}
      </div>
    );
  };

  const renderAudio = () => (
    <audio src={mediaUrl} controls />
  );

  const renderVideo = () => {
    if (!mediaUrl) {
      return null;
    }
    if (isMediaFile(mediaUrl)) {
      return <video src={mediaUrl} controls />;
    }
    const embedUrl = normalizeEmbedUrl(mediaUrl) || mediaUrl;
    return (
      <div dangerouslySetInnerHTML={{ __html: iframeHtml(embedUrl, embeddedMediaTitle) }} />
    );
  };

  if (hasImageComposite) {
    return <div className="node-media" data-role="media">{renderImageComposite()}</div>;
  }

  if (mediaType === "audio") {
    return <div className="node-media" data-role="media">{renderAudio()}</div>;
  }

  if (mediaType === "video") {
    return <div className="node-media" data-role="media">{renderVideo()}</div>;
  }

  return <div className="node-media" data-role="media" />;
};

export default MediaDisplay;
