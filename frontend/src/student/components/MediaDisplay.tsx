import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Node } from "../../types";
import { normalizeEmbedUrl, isMediaFile } from "../mediaUtils";
import { notifyHostRemeasure } from "../../notifyHostRemeasure";

interface MediaDisplayProps {
  node: Node;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  overlayEnabled: boolean;
  contentHtml: string;
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
  const mediaAlt = media.alt || "";

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
            onLoad={notifyHostRemeasure}
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
                onLoad={notifyHostRemeasure}
              />
            )}
            {node.right_image_url && (
              <img
                className="bx-image-composite__img bx-image-composite__img--right"
                src={node.right_image_url}
                alt={node.right_image_alt_text || ""}
                onLoad={notifyHostRemeasure}
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

  const renderSingleImage = () => (
    <img
      className="bx-single-image"
      src={mediaUrl}
      alt={mediaAlt}
      onLoad={notifyHostRemeasure}
    />
  );

  const renderAudio = () => (
    <audio src={mediaUrl} controls />
  );

  const renderVideo = () => {
    if (!mediaUrl) {
      return null;
    }
    if (isMediaFile(mediaUrl)) {
      return <video src={mediaUrl} controls onLoadedMetadata={notifyHostRemeasure} />;
    }
    const embedUrl = normalizeEmbedUrl(mediaUrl) || mediaUrl;
    return (
      <div className="bx-media-embed">
        <iframe
          src={embedUrl}
          title={embeddedMediaTitle}
          allow="autoplay; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    );
  };

  let mediaContent: React.ReactNode = null;
  if (mediaType === "video" && mediaUrl) {
    mediaContent = renderVideo();
  } else if (mediaType === "audio" && mediaUrl) {
    mediaContent = renderAudio();
  } else if (mediaType === "single_image" && mediaUrl) {
    mediaContent = renderSingleImage();
  } else if (mediaType === "image") {
    mediaContent = renderImageComposite();
  }

  return <div className="node-media" data-role="media">{mediaContent}</div>;
};

export default MediaDisplay;
