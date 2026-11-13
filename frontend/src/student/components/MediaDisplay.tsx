import React from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Node } from "../../types";
import { NodeMedia, normalizeEmbedUrl, isMediaFile } from "../mediaUtils";
import { notifyHostRemeasure } from "../../notifyHostRemeasure";

interface MediaDisplayProps {
  /** Decided once by describeNodeMedia; this module only renders it. */
  media: NodeMedia;
  node: Node;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  contentHtml: string;
}

const MediaDisplay: React.FC<MediaDisplayProps> = ({
  media,
  node,
  background_image_url,
  background_image_alt_text,
  background_image_is_decorative,
  contentHtml,
}) => {
  const intl = useIntl();
  const embeddedMediaTitle = intl.formatMessage(studentMessages.embeddedMedia);

  const renderImageComposite = (backgroundOnly: boolean, overlay: boolean) => (
    <div
      className={`bx-image-composite${backgroundOnly ? " bx-image-composite--bg-only" : ""}`}
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
      {!backgroundOnly && (
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
      {overlay && (
        <div
          className="media-overlay__text bx-image-composite__overlay"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </div>
  );

  const renderSingleImage = (url: string, alt: string) => (
    <img
      className="bx-single-image d-block w-100 mw-100"
      src={url}
      alt={alt}
      onLoad={notifyHostRemeasure}
    />
  );

  // w-100, not auto: a centred flex item with width auto collapses the native control.
  const renderAudio = (url: string) => (
    <audio src={url} controls className="w-100" />
  );

  const renderVideo = (url: string) => {
    if (isMediaFile(url)) {
      return <video src={url} controls onLoadedMetadata={notifyHostRemeasure} />;
    }
    const embedUrl = normalizeEmbedUrl(url) || url;
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
  if (media.kind === "composite") {
    mediaContent = renderImageComposite(media.backgroundOnly, media.overlay);
  } else if (media.kind === "single_image") {
    mediaContent = renderSingleImage(media.url, media.alt);
  } else if (media.kind === "audio") {
    mediaContent = renderAudio(media.url);
  } else if (media.kind === "video") {
    mediaContent = renderVideo(media.url);
  }

  // Nothing to show, so no wrapper either: the layout never gets an empty media surface.
  if (!mediaContent) {
    return null;
  }

  return <div className="node-media" data-role="media">{mediaContent}</div>;
};

export default MediaDisplay;
