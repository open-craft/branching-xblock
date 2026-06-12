import React, { useReducer, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import { studioMessages } from "../messages";
import { StudioHandlerUrls, StudioInitialState, StudioMeta } from "../apiTypes";
import { XBlockRuntime } from "../mountApp";
import { SavePayload } from "./api";
import * as api from "./api";
import {
  studioReducer,
  initialEditorState,
  extractValidationKeys,
} from "./reducer";
import ActionBar from "./components/ActionBar";
import SettingsStep from "./components/SettingsStep";
import NodesStep from "./components/NodesStep";
import ImportModal from "./components/ImportModal";

interface StudioAppProps {
  handlerUrls: StudioHandlerUrls;
  initial_state: StudioInitialState;
  meta: StudioMeta;
  runtime: XBlockRuntime;
}

function downloadJsonFile(jsonData: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

const StudioApp: React.FC<StudioAppProps> = ({ handlerUrls, initial_state, meta, runtime }) => {
  const intl = useIntl();
  const [state, dispatch] = useReducer(studioReducer, initialEditorState());
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string | null>(null);

  // Hydrate on initial load
  useEffect(() => {
    dispatch({
      type: "HYDRATE",
      state: {
        nodes: initial_state.nodes,
        display_name: initial_state.display_name,
        enable_undo: initial_state.enable_undo,
        enable_scoring: initial_state.enable_scoring,
        enable_reset_activity: initial_state.enable_reset_activity,
        background_image_url: initial_state.background_image_url,
        background_image_alt_text: initial_state.background_image_alt_text,
        background_image_is_decorative: initial_state.background_image_is_decorative,
        grade_ranges: initial_state.grade_ranges,
      },
    });
  }, []);

  const [isSaving, setIsSaving] = React.useState(false);

  // Helpers
  const pendingDeleteCount = state.draftNodes.filter((n) => n.pending_delete).length;
  const hasValidationErrors = Boolean(
    Object.keys(state.validation.settingsFieldErrors).length > 0
    || Object.keys(state.validation.nodeFieldErrors).length > 0
    || state.validation.nodeErrorIds.size > 0
    || state.validation.globalErrors.length > 0
  );

  // Step navigation
  const goToNodes = useCallback(() => {
    dispatch({ type: "SET_STEP", step: "nodes" });
  }, []);

  const goToSettings = useCallback(() => {
    dispatch({ type: "SET_STEP", step: "settings" });
  }, []);

  // Apply server validation and navigate to the errored step/node
  const applyValidationAndNavigate = useCallback((res: Record<string, unknown>) => {
    const fieldErrors = (res.field_errors || {}) as Record<string, unknown>;
    const { nodeFieldErrors, nodeErrors, settingsFieldErrors } = extractValidationKeys(fieldErrors);
    const erroredNodeIds = new Set<string>([
      ...Object.keys(nodeFieldErrors),
      ...Object.keys(nodeErrors),
    ]);
    const firstErroredNodeId = state.draftNodes.find((node) => erroredNodeIds.has(node.id))?.id || null;

    dispatch({ type: "APPLY_VALIDATION", fieldErrors });
    if (firstErroredNodeId && !erroredNodeIds.has(state.selectedNodeId || "")) {
      dispatch({ type: "SELECT_NODE", nodeId: firstErroredNodeId });
    }

    // Navigate to the errored step
    if (Object.keys(settingsFieldErrors).length > 0) {
      dispatch({ type: "SET_STEP", step: "settings" });
    } else {
      dispatch({ type: "SET_STEP", step: "nodes" });
    }
  }, [state.draftNodes, state.selectedNodeId]);

  // Save handler
  const handleSave = useCallback(async () => {
    dispatch({ type: "CLEAR_VALIDATION" });
    setSaveErrorMessage(null);
    setIsSaving(true);

    const payload: SavePayload = {
      nodes: state.draftNodes.map((n) => ({
        id: n.id,
        content: (n.content || "").trim(),
        media: {
          // Composite ("image") uses left/right + background, not media.url, so blank it.
          // Single image / video / audio keep media.url; only single image keeps alt.
          type: n.media?.type || "",
          url: (n.media?.type === "image") ? "" : (n.media?.url || "").trim(),
          alt: (n.media?.type === "single_image") ? (n.media?.alt || "").trim() : "",
        },
        choices: Array.isArray(n.choices)
          ? n.choices
              .filter((c) => (c?.text || "").trim() || (c?.target_node_id || "").trim())
              .map((c) => ({
                text: c.text,
                target_node_id: c.target_node_id,
                score: c.score,
              }))
          : [],
        hint: (n.hint || "").trim(),
        overlay_text: Boolean(n.overlay_text),
        left_image_url: (n.left_image_url || "").trim(),
        right_image_url: (n.right_image_url || "").trim(),
        left_image_alt_text: (n.left_image_alt_text || "").trim(),
        right_image_alt_text: (n.right_image_alt_text || "").trim(),
        transcript_url: (n.transcript_url || "").trim(),
      })),
      deleted_node_ids: state.draftNodes
        .filter((n) => n.pending_delete)
        .map((n) => n.id),
      enable_undo: Boolean(state.draftSettings.enable_undo),
      enable_scoring: Boolean(state.draftSettings.enable_scoring),
      enable_reset_activity: Boolean(state.draftSettings.enable_reset_activity),
      display_name: state.draftSettings.display_name || "",
      background_image_url: state.draftSettings.background_image_url || "",
      background_image_alt_text: state.draftSettings.background_image_alt_text || "",
      background_image_is_decorative: Boolean(state.draftSettings.background_image_is_decorative),
      grade_ranges: (state.draftSettings.grade_ranges || []).map((r) => ({
        label: r.label as string,
        start: r.start as number,
        end: r.end as number,
      })),
    };

    runtime.notify?.("save", { state: "start" });

    try {
      const res = await api.saveScenario(handlerUrls.studio_submit, payload);
      if (res.result === "success") {
        // In Studio's runtime (cms.runtime.v1.js _handleSave), "save end" does not
        // just hide the "Saving" notification — it calls modal.onSave(), which closes
        // the editor modal and refreshes the XBlock. It must therefore fire ONLY on
        // success, and BEFORE "cancel" ("cancel"/modal-hidden nulls runtime.modal,
        // after which "end" would skip the refresh). On failure we deliberately do
        // not fire it: that would close the modal and destroy the author's draft.
        runtime.notify?.("save", { state: "end" });
        runtime.notify?.("cancel", {});
      } else {
        setSaveErrorMessage(null);
        applyValidationAndNavigate(res as unknown as Record<string, unknown>);
        setIsSaving(false);
      }
    } catch {
      setSaveErrorMessage(intl.formatMessage(studioMessages.saveNetworkError));
      setIsSaving(false);
    }
  }, [state, handlerUrls.studio_submit, runtime, applyValidationAndNavigate, intl]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    runtime.notify?.("cancel", {});
  }, [runtime]);

  // Export handler
  const handleExport = useCallback(async () => {
    try {
      const res = await api.exportNodes(handlerUrls.export_nodes);
      if (res.success && res.nodes) {
        downloadJsonFile({ nodes: res.nodes }, "branching-scenario-export.json");
      }
    } catch {
      // Silently fail for export
    }
  }, [handlerUrls.export_nodes]);

  // Import handlers
  const handleImportFileSelected = useCallback(
    (fileContent: unknown) => {
      dispatch({ type: "SET_IMPORT_FILE", fileContent });
    },
    [],
  );

  const handleImportFileError = useCallback(
    (errorMsg: string) => {
      dispatch({ type: "IMPORT_ERROR", error: errorMsg });
    },
    [],
  );

  const handleImportConfirm = useCallback(async () => {
    if (!state.importModal.fileContent) {
      dispatch({
        type: "IMPORT_ERROR",
        error: intl.formatMessage(studioMessages.pleaseSelectFile),
      });
      return;
    }
    dispatch({ type: "IMPORT_LOADING" });
    try {
      const res = await api.importNodes(handlerUrls.import_nodes, state.importModal.fileContent);
      if (res.success) {
        dispatch({ type: "IMPORT_SUCCESS" });
      } else {
        dispatch({
          type: "IMPORT_ERROR",
          error: res.error || intl.formatMessage(studioMessages.importFailed),
        });
      }
    } catch {
      dispatch({
        type: "IMPORT_ERROR",
        error: intl.formatMessage(studioMessages.importUnexpectedError),
      });
    }
  }, [state.importModal.fileContent, handlerUrls.import_nodes, intl]);

  const handleDownloadTemplate = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      downloadJsonFile(meta.import_template, "branching-scenario-template.json");
    },
    [meta.import_template],
  );

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Current node for editor
  const currentNode = state.selectedNodeId
    ? state.draftNodes.find((n) => n.id === state.selectedNodeId) || null
    : null;

  const nodeIdx = currentNode
    ? state.draftNodes.findIndex((n) => n.id === currentNode.id)
    : -1;

  return (
    <div>
      <div className="wrapper-comp-settings is-active editor-with-buttons">
        {/* Settings Step */}
        <div
          className="branching-editor-step"
          data-role="step-settings"
          hidden={state.currentStep !== "settings"}
        >
          <SettingsStep
            settings={state.draftSettings}
            validation={state.validation}
            authoringHelpHtml={meta.authoring_help_html}
            onUpdateField={(field, value) =>
              dispatch({ type: "UPDATE_SETTINGS_FIELD", field, value })
            }
            onChangeGradeRanges={(ranges) =>
              dispatch({ type: "UPDATE_SETTINGS_FIELD", field: "grade_ranges", value: ranges })
            }
          />
        </div>

        {/* Nodes Step */}
        <div
          className="branching-editor-step"
          data-role="step-nodes"
          hidden={state.currentStep !== "nodes"}
        >
          {state.currentStep === "nodes" && (
            <NodesStep
              nodes={state.draftNodes}
              selectedNodeId={state.selectedNodeId}
              currentNode={currentNode}
              nodeIdx={nodeIdx}
              validation={state.validation}
              savedNodesExist={state.savedNodesExist}
              onSelectNode={(nodeId) => {
                dispatch({ type: "SELECT_NODE", nodeId });
              }}
              onToggleDelete={(nodeId) => {
                dispatch({ type: "TOGGLE_DELETE_NODE", nodeId });
              }}
              onAddNode={() => dispatch({ type: "ADD_NODE" })}
              onUpdateField={(nodeId, field, value) =>
                dispatch({ type: "UPDATE_NODE_FIELD", nodeId, field, value })
              }
              onChangeChoice={(nodeId, choiceIndex, field, value) =>
                dispatch({ type: "UPDATE_CHOICE_FIELD", nodeId, choiceIndex, field, value })
              }
              onAddChoice={(nodeId) => dispatch({ type: "ADD_CHOICE", nodeId })}
              onDeleteChoice={(nodeId, choiceIndex) =>
                dispatch({ type: "DELETE_CHOICE", nodeId, choiceIndex })
              }
              onSetMediaType={(nodeId, type) =>
                dispatch({ type: "SET_MEDIA_TYPE", nodeId, mediaType: type })
              }
              onImport={() => dispatch({ type: "OPEN_IMPORT_MODAL" })}
              onExport={handleExport}
              onDownloadTemplate={handleDownloadTemplate}
            />
          )}
        </div>

        {/* Import Modal */}
        <ImportModal
          isOpen={state.importModal.isOpen}
          isLoading={state.importModal.isLoading}
          isSuccess={state.importModal.isSuccess}
          error={state.importModal.error}
          hasFile={Boolean(state.importModal.fileContent)}
          onClose={() => dispatch({ type: "CLOSE_IMPORT_MODAL" })}
          onFileSelected={handleImportFileSelected}
          onFileError={handleImportFileError}
          onConfirm={handleImportConfirm}
          onRefresh={handleRefresh}
        />

        {/* Global errors */}
        {(state.validation.globalErrors.length > 0 || saveErrorMessage) && (
          <div className="errors" style={{ color: "red" }}>
            {saveErrorMessage && (
              <div>{intl.formatMessage(studioMessages.errorSaving)}</div>
            )}
            {state.validation.globalErrors.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <ActionBar
        currentStep={state.currentStep}
        pendingDeleteCount={pendingDeleteCount}
        hasValidationErrors={hasValidationErrors}
        saveErrorMessage={saveErrorMessage}
        isSaving={isSaving}
        onContinue={goToNodes}
        onBack={goToSettings}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default StudioApp;
