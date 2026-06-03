import { postJson } from "../request";
import { StudioInitialState } from "../apiTypes";

export interface SavePayload {
  nodes: Array<Record<string, unknown>>;
  deleted_node_ids: string[];
  enable_undo: boolean;
  enable_scoring: boolean;
  enable_reset_activity: boolean;
  display_name: string;
  background_image_url: string;
  background_image_alt_text: string;
  background_image_is_decorative: boolean;
  grade_ranges: Array<{ label: string; start: number; end: number }>;
}

export interface SaveSuccess {
  result: "success";
}

export interface SaveError {
  result: "error";
  message: string;
  field_errors: Record<string, unknown>;
}

export type SaveResult = SaveSuccess | SaveError;

export interface ExportResult {
  success: boolean;
  nodes?: Array<Record<string, unknown>>;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
}

export async function saveScenario(url: string, payload: SavePayload): Promise<SaveResult> {
  return postJson<SaveResult>(url, payload);
}

export async function exportNodes(url: string): Promise<ExportResult> {
  return postJson<ExportResult>(url, {});
}

export async function importNodes(url: string, fileContent: unknown): Promise<ImportResult> {
  return postJson<ImportResult>(url, fileContent);
}

export async function fetchStudioState(url: string): Promise<StudioInitialState> {
  return postJson<StudioInitialState>(url, {});
}
