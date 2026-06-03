import { GradeRange } from "../types";

// ---- Draft types ----

export interface DraftChoice {
  text: string;
  target_node_id: string;
  score: number | string;
}

export interface DraftNode {
  id: string;
  content: string;
  media: { type: string; url: string };
  choices: DraftChoice[];
  no_branches: boolean;
  pending_delete: boolean;
  hint: string;
  overlay_text: boolean;
  transcript_url: string;
  left_image_url: string;
  right_image_url: string;
  left_image_alt_text: string;
  right_image_alt_text: string;
}

export interface DraftSettings {
  display_name: string;
  enable_undo: boolean;
  enable_scoring: boolean;
  enable_reset_activity: boolean;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  grade_ranges: GradeRange[];
}

export interface ImportModalState {
  isOpen: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  error: string;
  fileContent: unknown;
}

export interface ValidationState {
  settingsFieldErrors: Record<string, string>;
  globalErrors: string[];
  nodeErrorIds: Set<string>;
  nodeErrorTitles: Record<string, string>;
  nodeErrorDetails: Record<string, string>;
  nodeFieldErrors: Record<string, Record<string, string | Record<string, string>>>;
}

// ---- Full editor state ----

export interface StudioEditorState {
  currentStep: "settings" | "nodes";
  selectedNodeId: string | null;
  draftSettings: DraftSettings;
  draftNodes: DraftNode[];
  savedNodesExist: boolean;
  validation: ValidationState;
  importModal: ImportModalState;
  uniqueIdCounter: number;
}

// ---- Helpers ----

let counter = 0;
function uniqueId(): string {
  counter += 1;
  return `temp-${counter}`;
}

function emptyValidation(): ValidationState {
  return {
    settingsFieldErrors: {},
    globalErrors: [],
    nodeErrorIds: new Set(),
    nodeErrorTitles: {},
    nodeErrorDetails: {},
    nodeFieldErrors: {},
  };
}

export function buildDraftNode(raw: Record<string, unknown> | undefined): DraftNode {
  const media = (raw?.media as Record<string, unknown>) || {};
  const choices = Array.isArray(raw?.choices)
    ? (raw!.choices as Array<Record<string, unknown>>).map((c) => {
        const score = c?.score;
        return {
          text: (c?.text as string) || "",
          target_node_id: (c?.target_node_id as string) || "",
          score: typeof score === "number" || typeof score === "string" ? score : 0,
        };
      })
    : [];
  return {
    id: (raw?.id as string) || uniqueId(),
    content: (raw?.content as string) || "",
    media: {
      type: (media.type as string) || "",
      url: (media.url as string) || "",
    },
    choices,
    no_branches: Boolean(raw?.no_branches),
    pending_delete: false,
    hint: (raw?.hint as string) || "",
    overlay_text: Boolean(raw?.overlay_text),
    transcript_url: (raw?.transcript_url as string) || "",
    left_image_url: (raw?.left_image_url as string) ?? "",
    right_image_url: (raw?.right_image_url as string) ?? "",
    left_image_alt_text: (raw?.left_image_alt_text as string) || "",
    right_image_alt_text: (raw?.right_image_alt_text as string) || "",
  };
}

// ---- Actions ----

export type StudioAction =
  | { type: "SET_STEP"; step: "settings" | "nodes" }
  | { type: "SELECT_NODE"; nodeId: string }
  | { type: "ADD_NODE" }
  | { type: "TOGGLE_DELETE_NODE"; nodeId: string }
  | { type: "UPDATE_SETTINGS_FIELD"; field: string; value: unknown }
  | { type: "UPDATE_NODE_FIELD"; nodeId: string; field: string; value: unknown }
  | { type: "UPDATE_CHOICE_FIELD"; nodeId: string; choiceIndex: number; field: string; value: unknown }
  | { type: "ADD_CHOICE"; nodeId: string }
  | { type: "DELETE_CHOICE"; nodeId: string; choiceIndex: number }
  | { type: "SET_MEDIA_TYPE"; nodeId: string; mediaType: string }
  | { type: "APPLY_VALIDATION"; fieldErrors: Record<string, unknown> }
  | { type: "CLEAR_VALIDATION" }
  | { type: "OPEN_IMPORT_MODAL" }
  | { type: "CLOSE_IMPORT_MODAL" }
  | { type: "IMPORT_LOADING" }
  | { type: "IMPORT_SUCCESS" }
  | { type: "IMPORT_ERROR"; error: string }
  | { type: "SET_IMPORT_FILE"; fileContent: unknown }
  | { type: "HYDRATE"; state: { nodes: Record<string, unknown>; display_name: string; enable_undo: boolean; enable_scoring: boolean; enable_reset_activity: boolean; background_image_url: string; background_image_alt_text: string; background_image_is_decorative: boolean; grade_ranges: GradeRange[] } };

// ---- Reducer ----

export function studioReducer(state: StudioEditorState, action: StudioAction): StudioEditorState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId };

    case "ADD_NODE": {
      const activeNodes = state.draftNodes.filter((n) => !n.pending_delete);
      if (activeNodes.length >= 30) return state;
      const node = buildDraftNode({});
      return {
        ...state,
        draftNodes: [...state.draftNodes, node],
        selectedNodeId: node.id,
      };
    }

    case "TOGGLE_DELETE_NODE": {
      const idx = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx < 0) return state;
      const updated = [...state.draftNodes];
      updated[idx] = { ...updated[idx], pending_delete: !updated[idx].pending_delete };
      return { ...state, draftNodes: updated };
    }

    case "UPDATE_SETTINGS_FIELD": {
      const settings = { ...state.draftSettings, [action.field]: action.value };
      if (action.field === "background_image_is_decorative" && action.value) {
        settings.background_image_alt_text = "";
      }
      return { ...state, draftSettings: settings };
    }

    case "UPDATE_NODE_FIELD": {
      const idx2 = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx2 < 0) return state;
      const nodes = [...state.draftNodes];
      nodes[idx2] = { ...nodes[idx2], [action.field]: action.value };
      return { ...state, draftNodes: nodes };
    }

    case "UPDATE_CHOICE_FIELD": {
      const idx3 = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx3 < 0) return state;
      const nodes = [...state.draftNodes];
      const node = { ...nodes[idx3] };
      const choices = [...node.choices];
      if (action.choiceIndex < choices.length) {
        choices[action.choiceIndex] = {
          ...choices[action.choiceIndex],
          [action.field]: action.value,
        };
      }
      node.choices = choices;
      nodes[idx3] = node;
      return { ...state, draftNodes: nodes };
    }

    case "ADD_CHOICE": {
      const idx4 = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx4 < 0) return state;
      const nodes = [...state.draftNodes];
      const node = { ...nodes[idx4], no_branches: false };
      node.choices = [...node.choices, { text: "", target_node_id: "", score: 0 }];
      nodes[idx4] = node;
      return { ...state, draftNodes: nodes };
    }

    case "DELETE_CHOICE": {
      const idx5 = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx5 < 0) return state;
      const nodes = [...state.draftNodes];
      const node = { ...nodes[idx5] };
      node.choices = node.choices.filter((_, i) => i !== action.choiceIndex);
      nodes[idx5] = node;
      return { ...state, draftNodes: nodes };
    }

    case "SET_MEDIA_TYPE": {
      // Bug fix: never clear image URL fields when media type changes.
      // Image URLs and media type are orthogonal in the data model.
      const idx6 = state.draftNodes.findIndex((n) => n.id === action.nodeId);
      if (idx6 < 0) return state;
      const nodes = [...state.draftNodes];
      const node = { ...nodes[idx6] };
      const prevType = node.media.type;
      node.media = { ...node.media, type: action.mediaType };
      // Clear media URL when switching away from audio/video
      if (prevType !== action.mediaType && action.mediaType !== "audio" && action.mediaType !== "video") {
        node.media.url = "";
      }
      // Clear transcript when switching away from audio/video
      if (action.mediaType !== "audio" && action.mediaType !== "video") {
        node.transcript_url = "";
      }
      // Reset overlay_text when switching away from image
      if (action.mediaType !== "image") {
        node.overlay_text = false;
      }
      nodes[idx6] = node;
      return { ...state, draftNodes: nodes };
    }

    case "APPLY_VALIDATION": {
      const fieldErrors = action.fieldErrors || {};
      const nodeFieldErrors = (fieldErrors.node_input_errors || fieldErrors.node_field_errors || {}) as Record<string, Record<string, string | Record<string, string>>>;
      const nodeErrors = (fieldErrors.node_action_errors || fieldErrors.node_errors || {}) as Record<string, { title: string; detail: string }>;
      const settingsFieldErrors = (fieldErrors.settings_field_errors || {}) as Record<string, string>;
      const globalErrors = (Array.isArray(fieldErrors.global_errors) ? fieldErrors.global_errors : []) as string[];

      const validation: ValidationState = {
        settingsFieldErrors,
        globalErrors,
        nodeErrorIds: new Set<string>(),
        nodeErrorTitles: {},
        nodeErrorDetails: {},
        nodeFieldErrors: {},
      };

      Object.entries(nodeFieldErrors).forEach(([nodeId, errors]) => {
        if (errors && typeof errors === "object") {
          validation.nodeFieldErrors[nodeId] = errors;
          validation.nodeErrorIds.add(nodeId);
        }
      });

      Object.entries(nodeErrors).forEach(([nodeId, err]) => {
        if (err && typeof err === "object") {
          if (err.title) validation.nodeErrorTitles[nodeId] = err.title;
          if (err.detail) validation.nodeErrorDetails[nodeId] = err.detail;
          validation.nodeErrorIds.add(nodeId);
        }
      });

      return { ...state, validation };
    }

    case "CLEAR_VALIDATION":
      return { ...state, validation: emptyValidation() };

    case "OPEN_IMPORT_MODAL":
      return {
        ...state,
        importModal: { isOpen: true, isLoading: false, isSuccess: false, error: "", fileContent: null },
      };

    case "CLOSE_IMPORT_MODAL":
      return { ...state, importModal: { ...state.importModal, isOpen: false } };

    case "IMPORT_LOADING":
      return { ...state, importModal: { ...state.importModal, isLoading: true, error: "" } };

    case "IMPORT_SUCCESS":
      return { ...state, importModal: { ...state.importModal, isLoading: false, isSuccess: true } };

    case "IMPORT_ERROR":
      return {
        ...state,
        importModal: { ...state.importModal, isLoading: false, error: action.error, fileContent: null },
      };

    case "SET_IMPORT_FILE":
      return { ...state, importModal: { ...state.importModal, fileContent: action.fileContent, error: "" } };

    case "HYDRATE": {
      const rawNodes = action.state.nodes || {};
      const nodes = Object.values(rawNodes).map((n) => buildDraftNode(n as Record<string, unknown>));
      if (nodes.length === 0) {
        nodes.push(buildDraftNode({}));
      }
      return {
        ...state,
        draftNodes: nodes,
        selectedNodeId: nodes[0].id,
        savedNodesExist: Object.keys(rawNodes).length > 0,
        draftSettings: {
          display_name: action.state.display_name || "",
          enable_undo: Boolean(action.state.enable_undo),
          enable_scoring: Boolean(action.state.enable_scoring),
          enable_reset_activity: Boolean(action.state.enable_reset_activity),
          background_image_url: action.state.background_image_url || "",
          background_image_alt_text: action.state.background_image_alt_text || "",
          background_image_is_decorative: Boolean(action.state.background_image_is_decorative),
          grade_ranges: action.state.grade_ranges || [],
        },
      };
    }

    default:
      return state;
  }
}

export function initialEditorState(): StudioEditorState {
  return {
    currentStep: "settings",
    selectedNodeId: null,
    draftSettings: {
      display_name: "",
      enable_undo: false,
      enable_scoring: false,
      enable_reset_activity: false,
      background_image_url: "",
      background_image_alt_text: "",
      background_image_is_decorative: false,
      grade_ranges: [
        { label: "Fail", start: 0, end: 49 },
        { label: "Pass", start: 50, end: 100 },
      ],
    },
    draftNodes: [],
    savedNodesExist: false,
    validation: emptyValidation(),
    importModal: { isOpen: false, isLoading: false, isSuccess: false, error: "", fileContent: null },
    uniqueIdCounter: 0,
  };
}
