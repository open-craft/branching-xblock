import React, { useState, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../messages";
import { StudentInitialState, StudentHandlerUrls } from "../apiTypes";
import * as api from "./api";
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

  const replaceState = useCallback((newState: StudentInitialState) => {
    setState(newState);
    setIsReportVisible(false);
    setError(null);
    setStatusMessage(intl.formatMessage(studentMessages.contentUpdated));
  }, [intl]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.fetchState(handlerUrls.get_current_state)
      .then((data) => {
        setState(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || intl.formatMessage(studentMessages.errorLoadingScenario));
        setLoading(false);
      });
  }, [handlerUrls.get_current_state, intl]);

  const handleSelectChoice = useCallback(
    (choiceIndex: number) => {
      setLoading(true);
      setError(null);
      api.selectChoice(handlerUrls.select_choice, choiceIndex)
        .then(replaceState)
        .catch((err) => {
          setError(err.message || intl.formatMessage(studentMessages.errorSelectingChoice));
          setLoading(false);
        });
    },
    [handlerUrls.select_choice, replaceState, intl],
  );

  const handleUndo = useCallback(() => {
    setLoading(true);
    setError(null);
    api.undoChoice(handlerUrls.undo_choice)
      .then(replaceState)
      .catch((err) => {
        setError(err.message || intl.formatMessage(studentMessages.errorUndoChoice));
        setLoading(false);
      });
  }, [handlerUrls.undo_choice, replaceState, intl]);

  const handleReset = useCallback(() => {
    setLoading(true);
    setError(null);
    api.resetActivity(handlerUrls.reset_activity)
      .then(replaceState)
      .catch((err) => {
        setError(err.message || intl.formatMessage(studentMessages.errorResetActivity));
        setLoading(false);
      });
  }, [handlerUrls.reset_activity, replaceState, intl]);

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
  const overlayEnabled = Boolean(node.overlay_text);
  const hasImageComposite = Boolean(
    state.background_image_url || node.left_image_url || node.right_image_url
  );

  const choices = node.choices || [];
  const isLeaf = choices.length === 0;
  const isAtStartNode = node.id === state.start_node_id;
  const showReportButton = isLeaf && state.enable_scoring;
  const showReport = showReportButton && isReportVisible;
  const showReset = Boolean(state.enable_reset_activity && !isAtStartNode);
  const canUndo = Boolean(state.enable_undo && state.history.length > 0);
  const hasChoices = choices.length > 0;
  const showScore = !showReport && isLeaf && state.enable_scoring;
  const showTranscript = Boolean(
    (media.type === "audio" || media.type === "video") && node.transcript_url
  );

  return (
    <div className="branching-scenario">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      <div className="active-scenario" data-role="active">
        {error && <div className="errors" style={{ color: "red", padding: "1em" }}>{error}</div>}

        {!showReport && (
          <>
            {overlayEnabled && hasImageComposite ? null : (
              <ContentDisplay contentHtml={contentHtml} />
            )}
            <MediaDisplay
              node={node}
              background_image_url={state.background_image_url}
              background_image_alt_text={state.background_image_alt_text}
              background_image_is_decorative={state.background_image_is_decorative}
              overlayEnabled={overlayEnabled}
              contentHtml={contentHtml}
            />
            <TranscriptLink url={showTranscript ? node.transcript_url || "" : ""} />
            <HintCollapsible hintText={node.hint || ""} nodeId={nodeId} />
          </>
        )}

        {!showReport && (
          <ChoiceForm choices={choices} nodeId={nodeId} onSubmit={handleSelectChoice} />
        )}

        <ActionButtons
          enableUndo={state.enable_undo}
          canUndo={canUndo}
          showReset={showReset}
          showReport={showReportButton}
          hasChoices={hasChoices}
          onUndo={handleUndo}
          onReset={handleReset}
          onShowReport={handleShowReport}
        />

        {showScore && (
          <div className="score-display" data-role="score">
            {intl.formatMessage(studentMessages.scoreDisplay, { score: state.score, maxScore: state.max_score })}
          </div>
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
