import { studioReducer, initialEditorState, StudioEditorState, StudioAction, buildDraftNode } from "../studio/reducer";

describe("studioReducer", () => {
  let initialState: StudioEditorState;

  beforeEach(() => {
    initialState = initialEditorState();
    const rawNodes = {
      "node-abc": { id: "node-abc", content: "Hello", media: { type: "", url: "", alt: "" }, choices: [], hint: "", left_image_url: "", right_image_url: "", left_image_alt_text: "", right_image_alt_text: "", overlay_text: false, transcript_url: "" },
    };
    initialState = studioReducer(initialState, {
      type: "HYDRATE",
      state: {
        nodes: rawNodes,
        display_name: "Test",
        enable_undo: true,
        enable_scoring: true,
        enable_reset_activity: false,
        background_image_url: "",
        background_image_alt_text: "",
        background_image_is_decorative: false,
        grade_ranges: [{ label: "Fail", start: 0, end: 49 }, { label: "Pass", start: 50, end: 100 }],
      },
    });
  });

  describe("SET_STEP", () => {
    it("changes current step", () => {
      const state = studioReducer(initialState, { type: "SET_STEP", step: "nodes" });
      expect(state.currentStep).toBe("nodes");
    });
  });

  describe("SELECT_NODE", () => {
    it("sets selected node ID", () => {
      const nodeId = initialState.draftNodes[0].id;
      const state = studioReducer(initialState, { type: "SELECT_NODE", nodeId });
      expect(state.selectedNodeId).toBe(nodeId);
    });
  });

  describe("ADD_NODE", () => {
    it("adds a new node and selects it", () => {
      const initialCount = initialState.draftNodes.length;
      const state = studioReducer(initialState, { type: "ADD_NODE" });
      expect(state.draftNodes.length).toBe(initialCount + 1);
      expect(state.selectedNodeId).toBe(state.draftNodes[state.draftNodes.length - 1].id);
    });

    it("does not add if at max (30 active nodes)", () => {
      const stateWithMax = { ...initialState, draftNodes: Array.from({ length: 30 }, (_, i) => buildDraftNode({ id: `node-${i}` })) };
      const state = studioReducer(stateWithMax, { type: "ADD_NODE" });
      expect(state.draftNodes.length).toBe(30);
    });
  });

  describe("TOGGLE_DELETE_NODE", () => {
    it("marks a node for deletion", () => {
      const nodeId = initialState.draftNodes[0].id;
      const state = studioReducer(initialState, { type: "TOGGLE_DELETE_NODE", nodeId });
      expect(state.draftNodes[0].pending_delete).toBe(true);
    });

    it("restores a pending-delete node", () => {
      const nodeId = initialState.draftNodes[0].id;
      const marked = studioReducer(initialState, { type: "TOGGLE_DELETE_NODE", nodeId });
      const restored = studioReducer(marked, { type: "TOGGLE_DELETE_NODE", nodeId });
      expect(restored.draftNodes[0].pending_delete).toBe(false);
    });
  });

  describe("UPDATE_SETTINGS_FIELD", () => {
    it("updates a settings field", () => {
      const state = studioReducer(initialState, { type: "UPDATE_SETTINGS_FIELD", field: "display_name", value: "New Name" });
      expect(state.draftSettings.display_name).toBe("New Name");
    });

    it("clears alt text when background_image_is_decorative is set to true", () => {
      const withAlt = studioReducer(initialState, { type: "UPDATE_SETTINGS_FIELD", field: "background_image_alt_text", value: "My image" });
      const state = studioReducer(withAlt, { type: "UPDATE_SETTINGS_FIELD", field: "background_image_is_decorative", value: true });
      expect(state.draftSettings.background_image_alt_text).toBe("");
    });
  });

  describe("UPDATE_NODE_FIELD", () => {
    it("updates a node field", () => {
      const nodeId = initialState.draftNodes[0].id;
      const state = studioReducer(initialState, { type: "UPDATE_NODE_FIELD", nodeId, field: "content", value: "New content" });
      expect(state.draftNodes[0].content).toBe("New content");
    });
  });

  describe("SET_MEDIA_TYPE", () => {
    it("changes media type", () => {
      const nodeId = initialState.draftNodes[0].id;
      const state = studioReducer(initialState, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "video" });
      expect(state.draftNodes[0].media.type).toBe("video");
    });

    it("clears composite (left/right + overlay) fields when switching away from image", () => {
      const nodeId = initialState.draftNodes[0].id;
      let state = studioReducer(initialState, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "image" });
      state = studioReducer(state, { type: "UPDATE_NODE_FIELD", nodeId, field: "left_image_url", value: "http://example.com/img.jpg" });
      state = studioReducer(state, { type: "UPDATE_NODE_FIELD", nodeId, field: "overlay_text", value: true });
      // Switch to single image — composite fields should be cleared
      state = studioReducer(state, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "single_image" });
      expect(state.draftNodes[0].left_image_url).toBe("");
      expect(state.draftNodes[0].overlay_text).toBe(false);
    });

    it("preserves media.url/alt for single_image and clears them for composite image", () => {
      const nodeId = initialState.draftNodes[0].id;
      let state = studioReducer(initialState, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "single_image" });
      state = studioReducer(state, { type: "UPDATE_NODE_FIELD", nodeId, field: "media", value: { type: "single_image", url: "http://example.com/i.jpg", alt: "A description" } });
      expect(state.draftNodes[0].media.url).toBe("http://example.com/i.jpg");
      expect(state.draftNodes[0].media.alt).toBe("A description");
      // Switching to composite image clears media.url and media.alt
      state = studioReducer(state, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "image" });
      expect(state.draftNodes[0].media.url).toBe("");
      expect(state.draftNodes[0].media.alt).toBe("");
    });

    it("clears media URL when switching away from audio/video", () => {
      const nodeId = initialState.draftNodes[0].id;
      const withMedia = studioReducer(initialState, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "video" });
      const withUrl = studioReducer(withMedia, { type: "UPDATE_NODE_FIELD", nodeId, field: "media", value: { type: "video", url: "http://example.com/vid.mp4" } });
      const state = studioReducer(withUrl, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "image" });
      expect(state.draftNodes[0].media.url).toBe("");
    });

    it("does not carry media.url across url-using types (single_image -> video)", () => {
      const nodeId = initialState.draftNodes[0].id;
      let state = studioReducer(initialState, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "single_image" });
      state = studioReducer(state, { type: "UPDATE_NODE_FIELD", nodeId, field: "media", value: { type: "single_image", url: "http://example.com/i.jpg", alt: "x" } });
      // Switching to another url-using type must start fresh, not reuse the image URL.
      state = studioReducer(state, { type: "SET_MEDIA_TYPE", nodeId, mediaType: "video" });
      expect(state.draftNodes[0].media.url).toBe("");
      expect(state.draftNodes[0].media.alt).toBe("");
    });
  });

  describe("ADD_CHOICE / DELETE_CHOICE", () => {
    it("adds a choice to a node", () => {
      const nodeId = initialState.draftNodes[0].id;
      const state = studioReducer(initialState, { type: "ADD_CHOICE", nodeId });
      expect(state.draftNodes[0].choices.length).toBe(1);
      expect(state.draftNodes[0].no_branches).toBe(false);
    });

    it("deletes a choice by index", () => {
      const nodeId = initialState.draftNodes[0].id;
      let state = studioReducer(initialState, { type: "ADD_CHOICE", nodeId });
      state = studioReducer(state, { type: "ADD_CHOICE", nodeId });
      expect(state.draftNodes[0].choices.length).toBe(2);
      state = studioReducer(state, { type: "DELETE_CHOICE", nodeId, choiceIndex: 0 });
      expect(state.draftNodes[0].choices.length).toBe(1);
    });
  });

  describe("APPLY_VALIDATION", () => {
    it("populates validation state from server response", () => {
      const state = studioReducer(initialState, {
        type: "APPLY_VALIDATION",
        fieldErrors: {
          global_errors: ["At least one node is required"],
          settings_field_errors: { display_name: "Name is required" },
          node_input_errors: {
            "node-abc": {
              content: "Content cannot be empty",
              choiceScoreByIndex: { "0": "Invalid score" },
            },
          },
          node_action_errors: {
            "node-abc": { title: "Error", detail: "Something went wrong" },
          },
        },
      });
      expect(state.validation.globalErrors).toHaveLength(1);
      expect(state.validation.settingsFieldErrors.display_name).toBe("Name is required");
      expect(state.validation.nodeErrorIds.has("node-abc")).toBe(true);
      expect(state.validation.nodeFieldErrors["node-abc"].content).toBe("Content cannot be empty");
    });
  });

  describe("CLEAR_VALIDATION", () => {
    it("resets all validation state", () => {
      const withErrors = studioReducer(initialState, {
        type: "APPLY_VALIDATION",
        fieldErrors: { global_errors: ["Error"] },
      });
      const cleared = studioReducer(withErrors, { type: "CLEAR_VALIDATION" });
      expect(cleared.validation.globalErrors).toHaveLength(0);
      expect(cleared.validation.nodeErrorIds.size).toBe(0);
    });
  });

  describe("Import modal actions", () => {
    it("opens import modal with reset state", () => {
      const state = studioReducer(initialState, { type: "OPEN_IMPORT_MODAL" });
      expect(state.importModal.isOpen).toBe(true);
      expect(state.importModal.isLoading).toBe(false);
      expect(state.importModal.error).toBe("");
    });

    it("closes import modal", () => {
      const opened = studioReducer(initialState, { type: "OPEN_IMPORT_MODAL" });
      const closed = studioReducer(opened, { type: "CLOSE_IMPORT_MODAL" });
      expect(closed.importModal.isOpen).toBe(false);
    });

    it("sets loading state", () => {
      const opened = studioReducer(initialState, { type: "OPEN_IMPORT_MODAL" });
      const loading = studioReducer(opened, { type: "IMPORT_LOADING" });
      expect(loading.importModal.isLoading).toBe(true);
    });

    it("sets success state", () => {
      const state = studioReducer(initialState, { type: "IMPORT_SUCCESS" });
      expect(state.importModal.isSuccess).toBe(true);
    });

    it("sets error state", () => {
      const opened = studioReducer(initialState, { type: "OPEN_IMPORT_MODAL" });
      const errored = studioReducer(opened, { type: "IMPORT_ERROR", error: "Bad file" });
      expect(errored.importModal.error).toBe("Bad file");
      expect(errored.importModal.fileContent).toBeNull();
    });
  });
});
