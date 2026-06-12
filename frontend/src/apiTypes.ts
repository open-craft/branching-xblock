import { Node, GradeRange } from "./types";
import { XBlockPayloadBase } from "./mountApp";

// ---- Student view ----

export interface StudentHandlerUrls {
  select_choice: string;
  undo_choice: string;
  reset_activity: string;
}

export interface GradeReport {
  score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  is_pass_style: boolean;
  detailed_scores: Array<{ choice_text: string; awarded_points: number }>;
}

// Fields the student frontend actually consumes; the backend payload may carry more.
export interface StudentInitialState {
  nodes: Record<string, Node>;
  start_node_id: string | null;
  enable_undo: boolean;
  enable_scoring: boolean;
  enable_reset_activity: boolean;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  max_score: number;
  current_node: Node | null;
  history: string[];
  score: number;
  grade_report: GradeReport;
}

export interface StudentPayload extends XBlockPayloadBase {
  view: "student";
  handler_urls: StudentHandlerUrls;
  initial_state: StudentInitialState;
}

// ---- Studio view ----

export interface StudioHandlerUrls {
  studio_submit: string;
  export_nodes: string;
  import_nodes: string;
}

export interface StudioInitialState {
  nodes: Record<string, Node>;
  enable_undo: boolean;
  enable_scoring: boolean;
  enable_reset_activity: boolean;
  max_score: number;
  grade_ranges: GradeRange[];
  display_name: string;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
}

export interface StudioMeta {
  authoring_help_html: string;
  import_template: { nodes: Node[] };
}

export interface StudioPayload extends XBlockPayloadBase {
  view: "studio";
  handler_urls: StudioHandlerUrls;
  initial_state: StudioInitialState;
  meta: StudioMeta;
}


export interface ValidationErrors {
  node_input_errors: Record<string, Record<string, string | Record<string, string>>>;
  settings_field_errors: Record<string, string>;
  global_errors: string[];
  node_action_errors: Record<string, { title: string; detail: string }>;
}
