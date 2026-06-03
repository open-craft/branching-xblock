"""Branching Scenario XBlock."""
import json
import os
import uuid
from collections import deque
from typing import Any, Optional

from django.conf import settings
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Boolean, Dict, Integer, List, Scope, String
from xblock.utils.resources import ResourceLoader

from .compat import get_site_configuration_value, sanitize_html

resource_loader = ResourceLoader(__name__)

DFS_STATE_UNVISITED = 0
DFS_STATE_VISITING = 1
DFS_STATE_VISITED = 2

MAX_NODES = 30


def _default_node(**overrides):
    """
    Return a node dict with all canonical fields set to defaults.

    This is the single source of truth for the node field structure.
    Pass keyword arguments to override specific fields.
    """
    node = {
        "id": "",
        "content": "",
        "media": {"type": "", "url": ""},
        "left_image_url": "",
        "right_image_url": "",
        "left_image_alt_text": "",
        "right_image_alt_text": "",
        "overlay_text": False,
        "choices": [],
        "hint": "",
        "transcript_url": "",
    }
    node.update(overrides)
    return node


IMPORT_TEMPLATE_NODES = (
    _default_node(
        id="start",
        content="<p>This is the first node. The first node in the array is always the start node.</p>",
        choices=[{"text": "Go to ending", "target_node_id": "ending", "score": 50}],
    ),
    _default_node(
        id="ending",
        content="<p>This is the end node. Nodes with no choices are end nodes.</p>",
    ),
)


class BranchingXBlock(XBlock):
    """
    Branching Scenario XBlock.

    Example node structure::

        {
            "id": "node-1",
            "content": "<p>...</p>",
            "media": {"type": "image", "url": "/asset.jpg"},
            "choices": [
                {
                    "text": "Choice 1",
                    "target_node_id": "node-2",
                    "feedback": "...",
                    "hint": "..."
                }
            ],
            "hint": "some hint"
        }

    """

    display_name = String(
        default="Branching Scenario",
        scope=Scope.settings,
        help="Name of this XBlock in the course outline"
    )

    scenario_data = Dict(
        default={
            "nodes": {},
            "start_node_id": None,
        },
        scope=Scope.content,
        help="Nodes and connections defining the branching path"
    )

    enable_undo = Boolean(
        default=False,
        scope=Scope.content,
        help="Allow learners to backtrack through choices"
    )

    enable_scoring = Boolean(
        default=False,
        scope=Scope.content,
        help="Enable scoring for gradebook integration"
    )

    enable_reset_activity = Boolean(
        default=False,
        scope=Scope.content,
        help="Allow learners to reset the activity"
    )

    background_image_url = String(
        default="",
        scope=Scope.content,
        help="Background image URL used for image nodes"
    )

    background_image_alt_text = String(
        default="",
        scope=Scope.content,
        help="Alt text for the background image"
    )

    background_image_is_decorative = Boolean(
        default=False,
        scope=Scope.content,
        help="Whether the background image is decorative"
    )

    max_score = Integer(
        default=100,
        scope=Scope.content,
        help="Score awarded when scenario is completed (if scoring enabled)"
    )

    grade_ranges = List(
        default=[
            {"label": "Fail", "start": 0, "end": 49},
            {"label": "Pass", "start": 50, "end": 100},
        ],
        scope=Scope.content,
        help="Grade range segments for end-of-activity grade report"
    )

    current_node_id = String(
        scope=Scope.user_state,
        default=None,
        help="Learner's current position in the scenario"
    )

    history = List(
        scope=Scope.user_state,
        default=[],
        help="Path history for undo functionality"
    )

    score_history = List(
        scope=Scope.user_state,
        default=[],
        help="Awarded points per selected choice, used for undo/reset"
    )

    choice_history = List(
        scope=Scope.user_state,
        default=[],
        help="Selected choice records used for final report details"
    )

    has_completed = Boolean(
        scope=Scope.user_state,
        default=False,
        help="Completion status"
    )

    has_custom_completion = True
    _normalized_nodes_ref: Optional[dict[str, Any]] = None

    def start_node(self) -> None:
        """
        Set initial current_node_id if not set, or reset if stale.
        """
        if self.current_node_id and not self.get_node(self.current_node_id):
            # Node no longer exists (scenario was re-imported). Reset learner state.
            self.current_node_id = None
            self.history = []
            self.score_history = []
            self.choice_history = []
            self.has_completed = False
        if not self.current_node_id and self.scenario_data.get("start_node_id"):
            self.current_node_id = self.scenario_data["start_node_id"]

    def get_node(self, node_id: str) -> Optional[dict[str, Any]]:
        """
        Get a node by its ID.
        """
        nodes = self.scenario_data.get("nodes", {})
        if not isinstance(nodes, dict):
            return None

        node = nodes.get(node_id)
        if not isinstance(node, dict):
            return None

        return node

    def _normalize_scenario_nodes(self) -> None:
        """
        Normalize authoring payload shape for already-persisted scenario nodes.

        Studio can load node data that was saved before newer authoring fields
        (e.g. `overlay_text`, `left_image_url`, `right_image_url`, normalized
        `choices[*].score`) existed. Without this pass, the editor can receive
        inconsistent node objects and fail to render/update reliably.

        What this does:
        - Ensures `scenario_data["nodes"]` is a dict.
        - Drops malformed non-dict nodes/choices.
        - Fills missing node keys required by the current editor schema.
        - Normalizes choice score shape for editor reads.
        - Writes back only when changes are needed.
        - Runs once per `nodes` object via `_normalized_nodes_ref`.

        Removal plan:
        Once all persisted scenario data is guaranteed to follow the current
        schema, this can be deleted.
        """
        nodes = self.scenario_data.get("nodes", {})
        if nodes is self._normalized_nodes_ref:
            return

        if not isinstance(nodes, dict):
            self.scenario_data = {**self.scenario_data, "nodes": {}}
            self._normalized_nodes_ref = self.scenario_data["nodes"]
            return

        normalized_nodes: dict[str, dict[str, Any]] = {}
        changed = False
        for node_id, node in nodes.items():
            if not isinstance(node, dict):
                changed = True
                continue

            normalized_node, node_changed = self._normalize_scenario_node(node)
            if node_changed:
                changed = True

            normalized_nodes[node_id] = normalized_node

        if changed:
            self.scenario_data = {**self.scenario_data, "nodes": normalized_nodes}
            nodes = self.scenario_data.get("nodes", {})

        self._normalized_nodes_ref = nodes

    def _normalize_scenario_node(self, node: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        """
        Normalize one stored node payload for backward-compatible authoring reads.
        """
        normalized_node = dict(node)
        changed = False

        # Remove deprecated type field from old persisted data.
        if "type" in normalized_node:
            del normalized_node["type"]
            changed = True

        # Special migration: old image nodes stored the URL in media.url.
        if "left_image_url" not in normalized_node:
            media = normalized_node.get("media") or {}
            normalized_node["left_image_url"] = (
                media.get("url", "") if (media.get("type") == "image") else ""
            )
            changed = True

        # Back-fill any remaining missing fields using canonical defaults.
        defaults = _default_node()
        for key, default_value in defaults.items():
            if key in ("id", "media", "choices"):
                continue  # These have their own normalization logic below.
            if key not in normalized_node:
                normalized_node[key] = default_value
                changed = True

        raw_choices = normalized_node.get("choices", [])
        choices_were_invalid = not isinstance(raw_choices, list)
        if choices_were_invalid:
            raw_choices = []
            changed = True

        normalized_choices = []
        for raw_choice in raw_choices:
            normalized_choice, choice_changed = self._normalize_choice_score(raw_choice)
            if normalized_choice is None:
                changed = True
                continue
            normalized_choices.append(normalized_choice)
            if choice_changed:
                changed = True

        if choices_were_invalid or normalized_choices != raw_choices:
            normalized_node["choices"] = normalized_choices
            changed = True

        if normalized_node != node:
            changed = True

        return normalized_node, changed

    def _normalize_choice_score(self, raw_choice: Any) -> tuple[Optional[dict[str, Any]], bool]:
        """
        Normalize one choice object's score shape for authoring reads.
        """
        if not isinstance(raw_choice, dict):
            return None, True

        choice = dict(raw_choice)
        changed = False
        raw_score = choice.get("score")

        if raw_score is None:
            if choice.get("score") != 0:
                choice["score"] = 0
                changed = True
        elif isinstance(raw_score, str):
            stripped_score = raw_score.strip()
            if not stripped_score:
                choice["score"] = 0
                changed = True
            else:
                score = self._parse_choice_score(raw_score)
                if score is not None and choice.get("score") != score:
                    choice["score"] = score
                    changed = True
        else:
            score = self._parse_choice_score(raw_score)
            if score is not None and choice.get("score") != score:
                choice["score"] = score
                changed = True

        return choice, changed

    def _parse_choice_score(self, raw_score: Any) -> Optional[int]:
        """
        Parse and validate choice score.
        """
        if isinstance(raw_score, bool):
            return None
        if isinstance(raw_score, int):
            score = raw_score
        elif isinstance(raw_score, float):
            if not raw_score.is_integer():
                return None
            score = int(raw_score)
        elif isinstance(raw_score, str):
            stripped = raw_score.strip()
            if not stripped or not stripped.lstrip('-').isdigit():
                return None
            score = int(stripped)
        else:
            try:
                score = int(raw_score)
            except (TypeError, ValueError):
                return None
        return score if 0 <= score <= 100 else None

    def _clean_choice_score(self, raw_score: Any) -> Optional[int]:
        """
        Normalise a raw choice score to an int, defaulting None/blank to 0.

        Returns an int (0-100) on success, or None if the value is invalid.
        """
        if raw_score is None or (isinstance(raw_score, str) and raw_score.strip() == ''):
            return 0
        return self._parse_choice_score(raw_score)

    @staticmethod
    def _node_has_content(node: dict[str, Any]) -> bool:
        """
        Return True if the node has any meaningful content, media, or choices.
        """
        has_content = bool((node.get('content') or '').strip())
        has_media = bool(
            (node.get('media', {}).get('url') or '').strip()
            or (node.get('left_image_url') or '').strip()
            or (node.get('right_image_url') or '').strip()
        )
        has_choices = any(
            isinstance(c, dict)
            and ((c.get('text') or '').strip() or (c.get('target_node_id') or '').strip())
            for c in (node.get('choices') or [])
        )
        return has_content or has_media or has_choices

    def _find_cycle_node_ids(self, nodes: dict[str, dict[str, Any]]) -> set[str]:
        """
        Return node IDs that participate in a directed cycle.
        """
        state = {}
        stack = []
        cycle_node_ids = set()

        def visit(node_id: str) -> None:
            state[node_id] = DFS_STATE_VISITING
            stack.append(node_id)
            node = nodes.get(node_id, {})
            for choice in node.get("choices", []) or []:
                target_node_id = choice.get("target_node_id")
                if target_node_id not in nodes:
                    continue
                target_state = state.get(target_node_id, DFS_STATE_UNVISITED)
                if target_state == DFS_STATE_UNVISITED:
                    visit(target_node_id)
                elif target_state == DFS_STATE_VISITING:
                    if target_node_id in stack:
                        cycle_start_index = stack.index(target_node_id)
                        cycle_node_ids.update(stack[cycle_start_index:])
            stack.pop()
            state[node_id] = DFS_STATE_VISITED

        for node_id in nodes:
            if state.get(node_id, DFS_STATE_UNVISITED) == DFS_STATE_UNVISITED:
                visit(node_id)

        return cycle_node_ids

    def _compute_max_attainable_score(
        self,
        nodes: dict[str, dict[str, Any]],
        start_node_id: Optional[str],
    ) -> int:
        """
        Compute the maximum total score over all reachable start-to-leaf paths.
        """
        if not start_node_id or start_node_id not in nodes:
            return 0

        # Phase 1: collect only nodes reachable from the start node.
        # This intentionally ignores orphan/disconnected nodes so they do not
        # affect the grade denominator.
        reachable = set()
        pending = deque([start_node_id])
        while pending:
            node_id = pending.popleft()
            if node_id in reachable:
                continue
            reachable.add(node_id)
            node = nodes.get(node_id, {})
            for choice in node.get("choices", []) or []:
                target_node_id = choice.get("target_node_id")
                if target_node_id in nodes and target_node_id not in reachable:
                    pending.append(target_node_id)

        # Phase 2: compute indegree on the reachable subgraph only.
        # We use indegree + queue to process nodes in topological order,
        # which is valid because cycles are blocked by save-time validation.
        indegree = {node_id: 0 for node_id in reachable}
        for node_id in reachable:
            node = nodes.get(node_id, {})
            for choice in node.get("choices", []) or []:
                target_node_id = choice.get("target_node_id")
                if target_node_id in reachable:
                    indegree[target_node_id] += 1

        topo_queue = deque([node_id for node_id, degree in indegree.items() if degree == 0])
        # best[node_id] stores the highest score found so far to reach node_id.
        # We seed start at 0 and then relax outgoing edges.
        best = {node_id: None for node_id in reachable}
        best[start_node_id] = 0

        while topo_queue:
            node_id = topo_queue.popleft()
            node_score = best[node_id]
            node = nodes.get(node_id, {})

            for choice in node.get("choices", []) or []:
                target_node_id = choice.get("target_node_id")
                if target_node_id not in reachable:
                    continue

                choice_score = choice.get("score", 0)
                if node_score is not None:
                    # Dynamic-programming relaxation:
                    # if this path gives a higher total for target, keep it.
                    candidate = node_score + choice_score
                    prev_best = best[target_node_id]
                    best[target_node_id] = candidate if prev_best is None else max(prev_best, candidate)

                indegree[target_node_id] -= 1
                if indegree[target_node_id] == 0:
                    topo_queue.append(target_node_id)

        # Phase 3: evaluate only leaf nodes (no outgoing reachable targets).
        # Max attainable score is defined as best start->leaf path sum.
        leaf_scores = []
        for node_id in reachable:
            node = nodes.get(node_id, {})
            outgoing_targets = [
                choice.get("target_node_id")
                for choice in (node.get("choices", []) or [])
                if choice.get("target_node_id") in reachable
            ]
            if not outgoing_targets and best[node_id] is not None:
                leaf_scores.append(best[node_id])

        # Defensive fallback: if no reachable leaf is detected, return the best
        # finite score encountered (or 0). This keeps behavior predictable even
        # for malformed graph edge-cases.
        if not leaf_scores:
            finite_scores = [score for score in best.values() if score is not None]
            return max(finite_scores) if finite_scores else 0

        return max(leaf_scores)

    def _validate_grade_ranges(self, grade_ranges: Any) -> Optional[str]:
        """
        Validate contiguous grade range segments from 0 through 100.
        """
        if not isinstance(grade_ranges, list) or len(grade_ranges) < 2:
            return "Grade ranges must contain at least two contiguous segments."

        expected_start = 0
        for index, grade_range in enumerate(grade_ranges):
            if not isinstance(grade_range, dict):
                return f"Grade range {index + 1} is invalid."

            start = grade_range.get("start")
            end = grade_range.get("end")
            label = str(grade_range.get("label", "")).strip()

            if label == "":
                return f"Grade range {index + 1} label is required."
            if not isinstance(start, int) or not isinstance(end, int):
                return f"Grade range {index + 1} bounds must be integers."
            if start < 0 or end > 100:
                return f"Grade range {index + 1} bounds must be between 0 and 100."
            if end < start:
                return f"Grade range {index + 1} has invalid bounds."
            if start != expected_start:
                return f"Grade range {index + 1} must start at {expected_start}."

            expected_start = end + 1

        if grade_ranges[-1]["end"] != 100:
            return "Final grade range must end at 100."
        return None

    def _build_grade_report(self) -> dict[str, Any]:
        """
        Compute learner-facing grade report data from current score state.
        """
        safe_ranges = self.grade_ranges

        max_score = int(self.max_score or 0)
        current_score = self._current_score()
        percentage = 0.0
        if max_score > 0.0:
            percentage = (current_score / max_score) * 100.0
        percentage = max(0.0, min(100.0, percentage))
        rounded_percentage = int(round(percentage))

        matched_index = 0
        matched_range = safe_ranges[0]
        for index, grade_range in enumerate(safe_ranges):
            if grade_range["start"] <= rounded_percentage <= grade_range["end"]:
                matched_index = index
                matched_range = grade_range
                break

        detailed_scores = []
        for entry in (self.choice_history or []):
            choice_text = str(entry.get("choice_text", "")).strip()
            if not choice_text:
                continue
            points = entry.get("awarded_points", 0)
            if not isinstance(points, int):
                points = 0
            detailed_scores.append({
                "choice_text": choice_text,
                "awarded_points": points,
            })

        return {
            "score": current_score,
            "max_score": max_score,
            "percentage": rounded_percentage,
            "grade_label": matched_range.get("label", ""),
            "is_pass_style": matched_index != 0,
            "detailed_scores": detailed_scores,
        }

    def _current_score(self) -> int:
        """
        Compute the learner's accumulated score from score history.
        """
        return sum(self.score_history)

    def get_current_node(self) -> Optional[dict[str, Any]]:
        """
        Get the learner's current node.
        """
        return self.get_node(self.current_node_id) if self.current_node_id else None

    def is_end_node(self, node_id: str) -> bool:
        """
        Check if node is a leaf node.
        """
        node = self.get_node(node_id)
        return bool(node) and not node.get("choices")

    def validate_scenario(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Validate studio payload and return structured validation results.
        """
        validation_errors = self._empty_validation_errors()

        raw_nodes = payload.get('nodes', [])
        deleted_node_ids = set(payload.get('deleted_node_ids', []))
        background_image_url = (payload.get('background_image_url') or '').strip()
        background_image_alt_text = (payload.get('background_image_alt_text') or '').strip()
        background_image_is_decorative = bool(payload.get('background_image_is_decorative', False))
        grade_ranges = payload.get('grade_ranges', self.grade_ranges)
        grade_ranges_error = self._validate_grade_ranges(grade_ranges)

        if background_image_url and not background_image_is_decorative and not background_image_alt_text:
            validation_errors["settings_field_errors"]["background_image_alt_text"] = (
                "Background image alt text is required unless the image is decorative."
            )
        if grade_ranges_error:
            validation_errors["settings_field_errors"]["grade_ranges"] = grade_ranges_error

        id_map, staged = self._build_staged_nodes(raw_nodes)
        staged_node_ids = {node["id"] for node in staged}

        resolved_deleted_node_ids = {
            id_map.get(node_id, node_id)
            for node_id in deleted_node_ids
        }
        node_number_by_id = {
            node['id']: index + 1
            for index, node in enumerate(staged)
        }

        self._validate_references(
            staged=staged,
            id_map=id_map,
            resolved_deleted_node_ids=resolved_deleted_node_ids,
            node_number_by_id=node_number_by_id,
            staged_node_ids=staged_node_ids,
            validation_errors=validation_errors,
        )
        final = self._build_final_nodes(staged, resolved_deleted_node_ids, id_map, validation_errors)

        if len(final) > MAX_NODES:
            self._add_global_error(validation_errors, f"Too many nodes (max {MAX_NODES}).")

        if not final:
            self._add_global_error(validation_errors, "At least one node is required")

        client_id_by_node_id = {
            node["id"]: node.get("client_id", node["id"])
            for node in final
        }

        nodes_dict = {
            node['id']: {
                key: value
                for key, value in node.items()
                if key != "client_id"
            }
            for node in final
        }

        cycle_node_ids = self._find_cycle_node_ids(nodes_dict)
        if cycle_node_ids:
            sorted_cycle_ids = sorted(cycle_node_ids)
            for node_id in sorted_cycle_ids:
                client_node_id = client_id_by_node_id.get(node_id, node_id)
                self._add_node_error(
                    validation_errors,
                    node_client_id=client_node_id,
                    title="Circular path detected",
                    detail="This node links back through branching choices. Remove one link in the loop.",
                )

        return {
            "validation_errors": validation_errors,
            "nodes_dict": nodes_dict,
            "start_node_id": final[0]['id'] if final else None,
            "background_image_url": background_image_url,
            "background_image_alt_text": background_image_alt_text,
            "background_image_is_decorative": background_image_is_decorative,
            "grade_ranges": grade_ranges,
        }

    def publish_grade(self) -> None:
        """
        Send score to gradebook.
        """
        if self.enable_scoring:
            self.runtime.publish(
                self,
                "grade",
                {"value": self._current_score(), "max_value": self.max_score}
            )

    def resource_string(self, path: str) -> str:
        """
        Retrieve string contents for the file path.
        """
        path = os.path.join('static', path)
        return resource_loader.load_unicode(path)

    def _local_resource_absolute_url(self, path: str) -> str:
        """
        Return an absolute resource URL for styles loaded by the React runtime.
        """
        root_url = getattr(settings, "LMS_ROOT_URL", "") or ""
        return root_url + self.runtime.local_resource_url(self, path)

    def _mfe_config_api_url(self) -> str:
        """
        Return the platform MFE config endpoint used to discover Paragon theme CSS.
        """
        root_url = getattr(settings, "LMS_ROOT_URL", "") or ""
        return f"{root_url}/api/mfe_config/v1?mfe=learning" if root_url else ""

    def student_view(self, context: Optional[dict[str, Any]] = None) -> Fragment:
        """
        Create primary view of the BranchingXBlock, shown to students when viewing courses.
        """
        frag = Fragment('<div data-react-root="true"></div>')
        frag.add_css(self.resource_string("css/branching_xblock.css"))
        frag.add_javascript_url(self.runtime.local_resource_url(self, "static/bundles/student.js"))
        frag.initialize_js('BranchingXBlock', {
            "view": "student",
            "handler_urls": {
                "get_current_state": self.runtime.handler_url(self, "get_current_state"),
                "select_choice": self.runtime.handler_url(self, "select_choice"),
                "undo_choice": self.runtime.handler_url(self, "undo_choice"),
                "reset_activity": self.runtime.handler_url(self, "reset_activity"),
            },
            "initial_state": self._get_state(),
        })
        return frag

    def studio_view(self, context: Optional[dict[str, Any]] = None) -> Fragment:
        """
        Studio editor view shown to course authors.
        """
        self._normalize_scenario_nodes()
        frag = Fragment('<div data-react-root="true"></div>')
        frag.add_javascript_url(self.runtime.local_resource_url(self, "static/bundles/studio.js"))

        authoring_help_html = sanitize_html(
            get_site_configuration_value("branching_xblock", "AUTHORING_HELP_HTML") or ""
        )
        frag.initialize_js('BranchingStudioEditor', {
            "view": "studio",
            "handler_urls": {
                "studio_submit": self.runtime.handler_url(self, "studio_submit"),
                "export_nodes": self.runtime.handler_url(self, "export_nodes"),
                "import_nodes": self.runtime.handler_url(self, "import_nodes"),
                "get_current_state": self.runtime.handler_url(self, "get_current_state"),
            },
            "initial_state": {
                "nodes": self.scenario_data.get("nodes", {}),
                "enable_undo": bool(self.enable_undo),
                "enable_scoring": bool(self.enable_scoring),
                "enable_reset_activity": bool(self.enable_reset_activity),
                "max_score": self.max_score,
                "grade_ranges": self.grade_ranges,
                "display_name": self.display_name,
                "background_image_url": self.background_image_url,
                "background_image_alt_text": self.background_image_alt_text,
                "background_image_is_decorative": bool(self.background_image_is_decorative),
            },
            "meta": {
                "authoring_help_html": authoring_help_html,
                "import_template": {"nodes": list(IMPORT_TEMPLATE_NODES)},
            },
            "mfe_config_api": self._mfe_config_api_url(),
            "style_urls": [
                self._local_resource_absolute_url("static/css/studio_editor.css"),
            ],
        })
        return frag

    def _get_state(self) -> dict[str, Any]:
        """
        Build the learner-facing runtime state payload.
        """
        nodes = self.scenario_data.get("nodes", {})

        return {
            "nodes":           nodes,
            "start_node_id":   self.scenario_data.get("start_node_id"),
            "enable_undo":     bool(self.enable_undo),
            "enable_scoring":  bool(self.enable_scoring),
            "enable_reset_activity": bool(self.enable_reset_activity),
            "background_image_url": self.background_image_url,
            "background_image_alt_text": self.background_image_alt_text,
            "background_image_is_decorative": bool(self.background_image_is_decorative),
            "max_score":       self.max_score,
            "grade_ranges":    self.grade_ranges,
            "display_name":    self.display_name,
            "current_node":    self.get_current_node(),
            "history":         list(self.history),
            "score_history":   list(self.score_history),
            "choice_history":  list(self.choice_history),
            "has_completed":   bool(self.has_completed),
            "score":           self._current_score(),
            "grade_report":    self._build_grade_report(),
        }

    @XBlock.json_handler
    def get_current_state(self, data: dict[str, Any], suffix: str = '') -> dict[str, Any]:
        """
        Fetch current state of the XBlock.
        """
        return self._get_state()

    @XBlock.json_handler
    def select_choice(self, data: dict[str, Any], suffix: str = '') -> dict[str, Any]:
        """
        Handle choice selection.
        """
        self.start_node()
        current_node = self.get_current_node()
        choice_index = data.get("choice_index")
        if current_node is None or choice_index is None:
            return {"success": False, "error": "Invalid choice"}
        choices = current_node.get("choices", [])
        if choice_index < 0 or choice_index >= len(choices):
            return {"success": False, "error": "Invalid choice index"}
        choice = choices[choice_index]
        target_node_id = choice.get("target_node_id")
        target_node = self.get_node(target_node_id)
        if not target_node:
            return {"success": False, "error": f"Target node {target_node_id} not found"}

        awarded_points = 0
        if self.enable_scoring:
            awarded_points = self._clean_choice_score(choice.get("score", 0))
            if awarded_points is None:
                return {"success": False, "error": "Invalid choice score"}
            self.score_history.append(awarded_points)
            self.choice_history.append({
                "source_node_id": self.current_node_id,
                "choice_text": (choice.get("text") or "").strip(),
                "awarded_points": awarded_points,
            })

        if self.enable_undo:
            self.history.append(self.current_node_id)
        self.current_node_id = target_node_id
        if self.is_end_node(target_node_id):
            self.has_completed = True
            if self.enable_scoring:
                self.publish_grade()
            self.runtime.publish(self, "completion", {"completion": 1.0})

        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def undo_choice(self, data: dict[str, Any], suffix: str = '') -> dict[str, Any]:
        """
        Handle undo choice.
        """
        if not self.enable_undo or not self.history:
            return {"success": False, "error": "Undo not allowed"}

        prev_node_id = self.history.pop()
        self.current_node_id = prev_node_id

        if self.enable_scoring:
            if self.score_history:
                self.score_history.pop()
            if self.choice_history:
                self.choice_history.pop()
            self.publish_grade()

        self.has_completed = False
        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def reset_activity(self, data: dict[str, Any], suffix: str = '') -> dict[str, Any]:
        """
        Reset learner state to the start node.
        """
        if not self.enable_reset_activity:
            return {"success": False, "error": "Reset not allowed"}

        self.current_node_id = None
        self.history = []
        self.has_completed = False

        self.score_history = []
        self.choice_history = []
        if self.enable_scoring:
            self.publish_grade()

        self.start_node()
        self.runtime.publish(self, "completion", {"completion": 0.0})
        return {"success": True, **self._get_state()}

    def _build_staged_nodes(
        self,
        raw_nodes: list[Any],
    ) -> tuple[dict[str, str], list[dict[str, Any]]]:
        """
        Assign stable IDs and normalize raw studio node payloads.
        """
        id_map = {}
        staged = []
        for raw in raw_nodes:
            if not isinstance(raw, dict):
                continue
            raw_old_id = raw.get('id')
            old_id = raw_old_id.strip() if isinstance(raw_old_id, str) else ''
            new_id = f"node-{uuid.uuid4().hex[:6]}" if old_id.startswith('temp-') or not old_id else old_id
            if old_id:
                id_map[old_id] = new_id
            node = _default_node(
                id=new_id,
                content=raw.get('content', ''),
                media={
                    'type': raw.get('media', {}).get('type', ''),
                    'url': raw.get('media', {}).get('url', ''),
                },
                left_image_url=raw.get('left_image_url', ''),
                right_image_url=raw.get('right_image_url', ''),
                left_image_alt_text=raw.get('left_image_alt_text', ''),
                right_image_alt_text=raw.get('right_image_alt_text', ''),
                choices=raw.get('choices', []) if isinstance(raw.get('choices'), list) else [],
                hint=raw.get('hint', ''),
                overlay_text=bool(raw.get('overlay_text', False)),
                transcript_url=raw.get('transcript_url', ''),
            )
            node['client_id'] = old_id or new_id
            staged.append(node)
        return id_map, staged

    @staticmethod
    def _empty_validation_errors():
        """Return a fresh structured validation errors dict."""
        return {
            "node_input_errors": {},
            "settings_field_errors": {},
            "global_errors": [],
            "node_action_errors": {},
        }

    def _has_validation_errors(self, validation_errors: dict[str, Any]) -> bool:
        """Return True when any validation bucket contains an error."""
        return any(bool(value) for value in validation_errors.values())

    def _add_global_error(self, validation_errors: dict[str, Any], message: str) -> None:
        errors = validation_errors["global_errors"]
        if message not in errors:
            errors.append(message)

    def _add_node_field_error(
        self,
        validation_errors: dict[str, Any],
        *,
        node_client_id: str,
        field_name: str,
        message: str,
    ) -> None:
        """Attach field-level validation error to a node."""
        node_errors = validation_errors["node_input_errors"].setdefault(node_client_id, {})
        if field_name not in node_errors:
            node_errors[field_name] = message

    def _add_node_indexed_error(
        self,
        validation_errors: dict[str, Any],
        *,
        node_client_id: str,
        field_name: str,
        index: int,
        message: str,
    ) -> None:
        """Attach a per-index validation error (for repeated node fields like choices)."""
        node_errors = validation_errors["node_input_errors"].setdefault(node_client_id, {})
        indexed_errors = node_errors.setdefault(field_name, {})
        key = str(index)
        if key not in indexed_errors:
            indexed_errors[key] = message

    def _add_node_error(
        self,
        validation_errors: dict[str, Any],
        *,
        node_client_id: str,
        title: str,
        detail: str,
    ) -> None:
        """Attach a node-level action error shown as a title/detail callout."""
        node_errors = validation_errors["node_action_errors"]
        if node_client_id not in node_errors:
            node_errors[node_client_id] = {"title": title, "detail": detail}

    def _error_response(self, validation_errors: dict[str, Any]) -> dict[str, Any]:
        """Build a structured validation error response for studio save."""
        field_errors = {
            key: value
            for key, value in validation_errors.items()
            if value
        }
        return {
            "result": "error",
            "message": "Validation errors",
            "field_errors": field_errors,
        }

    def _validate_references(
        self,
        *,
        staged: list[dict[str, Any]],
        id_map: dict[str, str],
        resolved_deleted_node_ids: set[str],
        node_number_by_id: dict[str, int],
        staged_node_ids: set[str],
        validation_errors: dict[str, Any],
    ) -> None:
        """
        Validate references to deleted/missing nodes and missing destinations.
        """
        client_id_by_id = {
            node["id"]: node.get("client_id", node["id"])
            for node in staged
        }
        for node in staged:
            if node['id'] in resolved_deleted_node_ids:
                continue
            node_client_id = node.get("client_id", node["id"])
            source_node_number = node_number_by_id.get(node['id'])
            for choice_index, raw_choice in enumerate(node['choices']):
                if not isinstance(raw_choice, dict):
                    continue
                choice_text = (raw_choice.get('text') or '').strip()
                raw_target = (raw_choice.get('target_node_id') or '').strip()
                if choice_text and not raw_target:
                    self._add_node_indexed_error(
                        validation_errors,
                        node_client_id=node_client_id,
                        field_name="choiceDestinationByIndex",
                        index=choice_index,
                        message="Required field",
                    )
                    continue
                if not raw_target:
                    continue

                target_node_id = id_map.get(raw_target, raw_target)
                target_node_client_id = client_id_by_id.get(target_node_id, target_node_id)

                if target_node_id not in staged_node_ids:
                    self._add_node_indexed_error(
                        validation_errors,
                        node_client_id=node_client_id,
                        field_name="choiceDestinationByIndex",
                        index=choice_index,
                        message="Selected destination is invalid.",
                    )
                    continue

                if target_node_id not in resolved_deleted_node_ids:
                    continue

                target_node_number = node_number_by_id.get(target_node_id)
                if source_node_number and target_node_number:
                    detail_message = (
                        f"Node {target_node_number} is referenced by Node {source_node_number}."
                    )
                else:
                    detail_message = "This node is still referenced by another node in this scenario."

                self._add_node_indexed_error(
                    validation_errors,
                    node_client_id=node_client_id,
                    field_name="choiceDestinationByIndex",
                    index=choice_index,
                    message="Selected destination is pending deletion.",
                )
                self._add_node_error(
                    validation_errors,
                    node_client_id=target_node_client_id,
                    title="You can't delete this node",
                    detail=detail_message,
                )

    def _build_final_nodes(
        self,
        staged: list[dict[str, Any]],
        resolved_deleted_node_ids: set[str],
        id_map: dict[str, str],
        validation_errors: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Remap targets, drop blank nodes, and validate per-node fields.
        """
        final = []
        for node in staged:
            if node['id'] in resolved_deleted_node_ids:
                continue

            node_client_id = node.get("client_id", node["id"])
            if not self._node_has_content(node):
                continue

            left_image_url = (node.get('left_image_url', '') or '').strip()
            right_image_url = (node.get('right_image_url', '') or '').strip()
            if node.get("media", {}).get("type") == "image" and not left_image_url and not right_image_url:
                self._add_node_field_error(
                    validation_errors,
                    node_client_id=node_client_id,
                    field_name="left_image_url",
                    message="Please enter a valid URL",
                )

            cleaned_choices = []
            for choice_index, raw_choice in enumerate(node['choices']):
                if not isinstance(raw_choice, dict):
                    self._add_node_indexed_error(
                        validation_errors,
                        node_client_id=node_client_id,
                        field_name="choiceScoreByIndex",
                        index=choice_index,
                        message="Score must be an integer between 0 and 100.",
                    )
                    continue
                text = raw_choice.get('text', '').strip()
                target_node_id = raw_choice.get('target_node_id', '').strip()
                if not (text or target_node_id):
                    continue

                raw_score = raw_choice.get('score', 0)
                score = self._clean_choice_score(raw_score)
                if score is None:
                    self._add_node_indexed_error(
                        validation_errors,
                        node_client_id=node_client_id,
                        field_name="choiceScoreByIndex",
                        index=choice_index,
                        message="Score must be an integer between 0 and 100.",
                    )
                    continue
                cleaned_choices.append({
                    'text': text,
                    'target_node_id': id_map.get(target_node_id, target_node_id),
                    'score': score,
                })

            final_node = _default_node(
                id=node['id'],
                content=sanitize_html(node['content']),
                media=node['media'],
                choices=cleaned_choices,
                hint=node.get('hint', ''),
                overlay_text=bool(node.get('overlay_text', False)),
                left_image_url=left_image_url,
                right_image_url=right_image_url,
                left_image_alt_text=str(node.get('left_image_alt_text', '') or '').strip(),
                right_image_alt_text=str(node.get('right_image_alt_text', '') or '').strip(),
                transcript_url=node.get('transcript_url', ''),
            )
            final_node['client_id'] = node_client_id
            final.append(final_node)
        return final

    @XBlock.json_handler
    def studio_submit(self, data: dict[str, Any], suffix: str = '') -> dict[str, Any]:
        """
        Handle studio editor save.
        """
        payload = data
        validation_result = self.validate_scenario(payload)
        validation_errors = validation_result["validation_errors"]
        nodes_dict = validation_result["nodes_dict"]
        start_node_id = validation_result["start_node_id"]

        if self._has_validation_errors(validation_errors):
            return self._error_response(validation_errors)

        # 3) Persist scenario_data & settings
        self.scenario_data = {
            'nodes': nodes_dict,
            'start_node_id': start_node_id,
        }
        self._normalized_nodes_ref = nodes_dict
        self.enable_undo = bool(payload.get('enable_undo', self.enable_undo))
        self.enable_scoring = bool(payload.get('enable_scoring', self.enable_scoring))
        self.enable_reset_activity = bool(payload.get('enable_reset_activity', self.enable_reset_activity))
        self.max_score = self._compute_max_attainable_score(
            nodes_dict,
            start_node_id,
        )
        self.display_name = payload.get('display_name', self.display_name)
        self.background_image_url = validation_result["background_image_url"]
        self.background_image_alt_text = validation_result["background_image_alt_text"]
        self.background_image_is_decorative = validation_result["background_image_is_decorative"]
        self.grade_ranges = validation_result["grade_ranges"]

        return {"result": "success"}

    @XBlock.json_handler
    def export_nodes(self, data, suffix=''):
        """Return current scenario nodes as a JSON-serializable list for download."""
        nodes = self.scenario_data.get("nodes", {})
        start_node_id = self.scenario_data.get("start_node_id")

        if not nodes:
            return {"success": False, "error": "No nodes to export."}

        # Build ordered list: start node first, then remaining nodes in dict order.
        ordered = []
        if start_node_id and start_node_id in nodes:
            ordered.append(start_node_id)
        for node_id in nodes:
            if node_id not in ordered:
                ordered.append(node_id)

        nodes_list = [dict(nodes[node_id]) for node_id in ordered]

        return {"success": True, "nodes": nodes_list}

    @XBlock.json_handler
    def import_nodes(self, data, suffix=''):
        """
        Import nodes from uploaded JSON, replacing the current scenario.
        """
        result = self._validate_import(data)
        if not result["success"]:
            return result

        nodes_dict = result["nodes_dict"]
        start_node_id = result["start_node_id"]

        self.scenario_data = {
            "nodes": nodes_dict,
            "start_node_id": start_node_id,
        }
        self._normalized_nodes_ref = nodes_dict
        self.max_score = self._compute_max_attainable_score(nodes_dict, start_node_id)

        return {"success": True}

    def _validate_import(self, parsed):
        """
        Validate parsed import JSON and return built nodes dict or error.
        """
        if not isinstance(parsed, dict):
            return {"success": False, "error": "Invalid format. Expected a JSON object with a \"nodes\" array."}

        raw_nodes = parsed.get("nodes")
        if not isinstance(raw_nodes, list) or not raw_nodes:
            return {"success": False, "error": "File must contain a \"nodes\" array with at least one node."}

        if len(raw_nodes) > MAX_NODES:
            return {"success": False, "error": f"File exceeds maximum of {MAX_NODES} nodes. Please try again."}

        # --- Validate IDs, collect targets, and pre-process for _build_staged_nodes ---
        seen_ids = {}
        pending_targets = []
        for index, raw_node in enumerate(raw_nodes):
            if not isinstance(raw_node, dict):
                return {"success": False, "error": f"Node {index + 1} is not a valid object."}
            original_id = str(raw_node.get("id", "")).strip()
            if not original_id:
                return {"success": False, "error": f"Node {index + 1} is missing an \"id\" field."}
            if original_id in seen_ids:
                return {"success": False, "error": f"Duplicate node id \"{original_id}\" found."}
            seen_ids[original_id] = index

            content = raw_node.get("content", "")
            if not isinstance(content, str):
                raw_node["content"] = str(content)

            raw_node["id"] = f"temp-{original_id}"
            for choice in (raw_node.get("choices") or []):
                if isinstance(choice, dict):
                    target = str(choice.get("target_node_id", "")).strip()
                    if target:
                        pending_targets.append((original_id, target))
                        choice["target_node_id"] = f"temp-{target}"

        for original_id, target in pending_targets:
            if target not in seen_ids:
                return {
                    "success": False,
                    "error": f"Node \"{original_id}\": choice references non-existent node \"{target}\".",
                }

        # --- call existing save pipeline ---
        id_map, staged = self._build_staged_nodes(raw_nodes)
        validation_errors = self._empty_validation_errors()
        final = self._build_final_nodes(staged, set(), id_map, validation_errors)

        if self._has_validation_errors(validation_errors):
            error_msg = self._first_validation_error_message(validation_errors)
            return {"success": False, "error": error_msg}

        if not final:
            return {"success": False, "error": "File must contain at least one non-empty node."}

        # --- Post-process: strip internal fields ---
        nodes_dict = {}
        for node in final:
            node_id = node["id"]
            node.pop("client_id", None)
            nodes_dict[node_id] = node

        start_node_id = next(iter(nodes_dict)) if nodes_dict else None

        cycle_ids = self._find_cycle_node_ids(nodes_dict)
        if cycle_ids:
            return {
                "success": False,
                "error": "Import contains circular paths between nodes. Please remove loops and try again.",
            }

        return {
            "success": True,
            "nodes_dict": nodes_dict,
            "start_node_id": start_node_id,
        }

    @staticmethod
    def _first_validation_error_message(validation_errors):
        """Extract the first human-readable error from structured validation errors."""
        for node_errors in validation_errors.get("node_input_errors", {}).values():
            for value in node_errors.values():
                if isinstance(value, str):
                    return value
                if isinstance(value, dict):
                    for msg in value.values():
                        return msg
        for error in validation_errors.get("global_errors", []):
            return error
        return "Import failed. Please check the file and try again."

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    def workbench_scenarios(self) -> list[tuple[str, str]]:
        """
        Create canned scenario for display in the workbench.
        """
        return [
            ("BranchingXBlock",
             """<branching_xblock/>
             """),
            ("Multiple BranchingXBlock",
             """<vertical_demo>
                <branching_xblock/>
                <branching_xblock/>
                <branching_xblock/>
                </vertical_demo>
             """),
        ]
