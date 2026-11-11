import React, { useCallback, useId, useState } from "react";
import { MessageDescriptor, useIntl } from "react-intl";
import Card from "@openedx/paragon/dist/Card";
import Icon from "@openedx/paragon/dist/Icon";
import IconButton from "@openedx/paragon/dist/IconButton";
import Stack from "@openedx/paragon/dist/Stack";
// Deep imports, not the icons barrel: each es5 module is a default export.
import AccountTree from "@openedx/paragon/icons/es5/AccountTree";
import Replay from "@openedx/paragon/icons/es5/Replay";
import { studentMessages } from "../messages";
import { StudentInitialState, StudentHandlerUrls } from "../apiTypes";
import * as api from "./api";
import { describeNodeMedia } from "./mediaUtils";
import MediaDisplay from "./components/MediaDisplay";
import ContentDisplay from "./components/ContentDisplay";
import HintCollapsible from "./components/HintCollapsible";
import ChoiceForm from "./components/ChoiceForm";
import ActionButtons from "./components/ActionButtons";
import GradeReport from "./components/GradeReport";
import TranscriptLink from "./components/TranscriptLink";

interface StudentAppProps {
  handlerUrls: StudentHandlerUrls;
  initial_state: StudentInitialState;
}

const StudentApp: React.FC<StudentAppProps> = ({ handlerUrls, initial_state }) => {
  const intl = useIntl();
  const [state, setState] = useState<StudentInitialState>(initial_state);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // Held here, not in ChoiceForm, so Submit can sit in the shared action row.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // The choice form is scoped to the choices pane: authored content must never sit
  // inside our form, or an author's own button would submit our selection.
  const choiceFormId = useId();

  const replaceState = useCallback((newState: StudentInitialState) => {
    setState(newState);
    setLoading(false);
    setIsReportVisible(false);
    setError(null);
    // A new node never inherits the previous selection.
    setSelectedIndex(null);
    setStatusMessage(intl.formatMessage(studentMessages.contentUpdated));
  }, [intl]);

  // One transition rule for every learner action. The request is a thunk so the
  // start state is written before the request is made, as it always was.
  const runAction = useCallback((
    request: () => Promise<StudentInitialState>,
    fallbackMessage: MessageDescriptor,
  ) => {
    setLoading(true);
    setError(null);
    request()
      .then(replaceState)
      .catch((err) => {
        setError(err.message || intl.formatMessage(fallbackMessage));
        setLoading(false);
      });
  }, [replaceState, intl]);

  const handleSelectChoice = useCallback(
    (choiceIndex: number) => {
      runAction(
        () => api.selectChoice(handlerUrls.select_choice, choiceIndex),
        studentMessages.errorSelectingChoice,
      );
    },
    [handlerUrls.select_choice, runAction],
  );

  const handleUndo = useCallback(() => {
    runAction(
      () => api.undoChoice(handlerUrls.undo_choice),
      studentMessages.errorUndoChoice,
    );
  }, [handlerUrls.undo_choice, runAction]);

  const handleReset = useCallback(() => {
    runAction(
      () => api.resetActivity(handlerUrls.reset_activity),
      studentMessages.errorResetActivity,
    );
  }, [handlerUrls.reset_activity, runAction]);

  const handleShowReport = useCallback(() => {
    setIsReportVisible(true);
  }, []);

  if (loading && !state.current_node) {
    return (
      <div className="branching-scenario">
        {intl.formatMessage(studentMessages.loading)}
      </div>
    );
  }

  const node = state.current_node || (state.start_node_id ? state.nodes[state.start_node_id] : null) || null;

  if (!node) {
    return (
      <div className="branching-scenario">
        {error || intl.formatMessage(studentMessages.noContent)}
      </div>
    );
  }

  const media = node.media || { type: "", url: "" };
  const nodeId = node.id || "";
  const contentHtml = node.content || "";
  // One decision, shared with MediaDisplay: presence, kind and overlay.
  const nodeMedia = describeNodeMedia(node, state.background_image_url);
  const hasMedia = nodeMedia.kind !== "none";
  const overlayEnabled = nodeMedia.kind === "composite" && nodeMedia.overlay;

  const choices = node.choices || [];
  const isLeaf = choices.length === 0;
  const isAtStartNode = node.id === state.start_node_id;
  const showReportButton = isLeaf && state.enable_scoring;
  const showReport = showReportButton && isReportVisible;
  const showReset = Boolean(state.enable_reset_activity && !isAtStartNode);
  const canUndo = Boolean(state.enable_undo && state.history.length > 0);
  // Accepted behaviour: no Go Back at the first step.
  const showGoBack = !isAtStartNode;
  const hasChoices = choices.length > 0;
  const showScore = !showReport && isLeaf && state.enable_scoring;
  const showTranscript = Boolean(
    (media.type === "audio" || media.type === "video") && node.transcript_url
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedIndex === null) {
      return;
    }
    handleSelectChoice(selectedIndex);
  };

  // When the content is the composite overlay, ContentDisplay is suppressed: the same HTML
  // is rendered once, inside the image.
  const contentBlock = overlayEnabled ? null : <ContentDisplay contentHtml={contentHtml} />;

  const mediaBlock = (
    <MediaDisplay
      media={nodeMedia}
      node={node}
      background_image_url={state.background_image_url}
      background_image_alt_text={state.background_image_alt_text}
      background_image_is_decorative={state.background_image_is_decorative}
      contentHtml={contentHtml}
    />
  );

  const supportBlocks = (
    <>
      <TranscriptLink url={showTranscript ? node.transcript_url || "" : ""} />
      <HintCollapsible hintText={node.hint || ""} nodeId={nodeId} />
    </>
  );

  // Option nodes: text/media left, choices right. Terminal nodes: text left, media right.
  const nodeBody = hasChoices ? (
    <div className="branching-scenario__content branching-scenario__content--choices flex-grow-1">
      <div className="branching-scenario__pane">
        {contentBlock}
        {hasMedia ? mediaBlock : null}
        {supportBlocks}
      </div>
      <form
        id={choiceFormId}
        className="branching-scenario__form"
        data-role="choice-form"
        onSubmit={handleSubmit}
      >
        <ChoiceForm
          choices={choices}
          nodeId={nodeId}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      </form>
    </div>
  ) : (
    <div
      className={`branching-scenario__content flex-grow-1${hasMedia ? " branching-scenario__content--terminal" : ""}`}
    >
      <div className="branching-scenario__pane">
        {contentBlock}
        {supportBlocks}
      </div>
      {hasMedia ? (
        <div className="branching-scenario__pane branching-scenario__pane--media">{mediaBlock}</div>
      ) : null}
    </div>
  );

  return (
    <div className="branching-scenario">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      <div className="active-scenario" data-role="active">
        {error && (
          // Stock Paragon alert classes only: the Alert component's JS pulls SCSS-only
          // breakpoint modules that this webpack build cannot resolve.
          <div role="alert" className="alert alert-danger alert-content branching-scenario__error">
            {error}
          </div>
        )}

        {!showReport && (
          <Card className="branching-scenario__card d-flex flex-column">
            {/* Column context is Paragon's (d-flex flex-column), so the body can absorb
                the card's min-height floor: the spare space lands inside the content,
                above the controls. Paragon 23 Card.Header is prop-driven: it ignores
                children. */}
            <Card.Header
              title={
                <Stack direction="horizontal" gap={3} className="branching-scenario__title">
                  <Icon src={AccountTree} className="branching-scenario__title-icon flex-shrink-0" />
                  <span className="branching-scenario__title-divider" aria-hidden="true" />
                  <h2 className="branching-scenario__title-text">
                    {intl.formatMessage(studentMessages.scenarioTitle)}
                  </h2>
                </Stack>
              }
              actions={
                showReset ? (
                  <IconButton
                    alt={intl.formatMessage(studentMessages.reset)}
                    className="branching-scenario__reset flex-shrink-0"
                    src={Replay}
                    onClick={handleReset}
                    data-role="reset-activity"
                  />
                ) : undefined
              }
            />
            <Card.Body className="branching-scenario__body d-flex flex-column flex-grow-1">
              {nodeBody}
              <ActionButtons
                submitFormId={choiceFormId}
                showSubmit={hasChoices}
                canSubmit={selectedIndex !== null}
                showGoBack={showGoBack}
                canUndo={canUndo}
                showReportButton={showReportButton}
                onUndo={handleUndo}
                onShowReport={handleShowReport}
              />
              {showScore && (
                <div className="score-display" data-role="score">
                  {intl.formatMessage(studentMessages.scoreDisplay, { score: state.score, maxScore: state.max_score })}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        <GradeReport
          reportData={state.grade_report}
          showResetInReport={showReset}
          onReset={handleReset}
          hidden={!showReport}
        />
      </div>
    </div>
  );
};

export default StudentApp;
