/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

/**
 * A single branching choice in a scenario node.
 */
export interface Choice {
  text?: string;
  target_node_id?: string;
  score?: number;
}
/**
 * A single grade range segment for the grade report.
 */
export interface GradeRange {
  label?: string;
  start?: number;
  end?: number;
}
/**
 * Media configuration for a scenario node.
 */
export interface Media {
  type?: string;
  url?: string;
  alt?: string;
}
/**
 * A single node in the branching scenario graph.
 */
export interface Node {
  id?: string;
  content?: string;
  media?: Media;
  choices?: Choice[];
  hint?: string;
  left_image_url?: string;
  right_image_url?: string;
  left_image_alt_text?: string;
  right_image_alt_text?: string;
  overlay_text?: boolean;
  transcript_url?: string;
}
/**
 * Top-level scenario payload stored in the XBlock's scenario_data field.
 */
export interface ScenarioData {
  nodes?: {
    [k: string]: Node;
  };
  start_node_id?: string | null;
}
/**
 * Scenario-level settings (mirrors XBlock content fields).
 */
export interface ScenarioSettings {
  display_name?: string;
  enable_undo?: boolean;
  enable_scoring?: boolean;
  enable_reset_activity?: boolean;
  background_image_url?: string;
  background_image_alt_text?: string;
  background_image_is_decorative?: boolean;
  max_score?: number;
  grade_ranges?: GradeRange[];
}
