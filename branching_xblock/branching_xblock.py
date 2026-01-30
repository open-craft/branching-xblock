"""Branching Scenario XBlock."""
import json
import os
import uuid
from typing import Any, Optional

from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Boolean, Dict, Float, List, Scope, String
from xblock.utils.resources import ResourceLoader

try:
    from xmodule.edxnotes_utils import edxnotes
except ModuleNotFoundError:
    def edxnotes(func):  # noqa: D103
        return func

from .compat import get_site_configuration_value, sanitize_html

resource_loader = ResourceLoader(__name__)


@XBlock.needs("user")
@edxnotes
class BranchingXBlock(XBlock):
    """
    Branching Scenario XBlock.

    Example node structure::

        {
            "id": "node-1",
            "type": "start",
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

    enable_hints = Boolean(
        default=False,
        scope=Scope.settings,
        help="Allow learners to reveal hints for each node"
    )

    max_score = Float(
        default=100.0,
        scope=Scope.content,
        help="Score awarded when scenario is completed (if scoring enabled)"
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

    score = Float(
        scope=Scope.user_state,
        default=0.0,
        help="Accumulated score (if scoring enabled)"
    )

    has_completed = Boolean(
        scope=Scope.user_state,
        default=False,
        help="Completion status"
    )

    has_custom_completion = True

    def start_node(self):
        """
        Set initial current_node_id if not set.
        """
        if not self.current_node_id and self.scenario_data["start_node_id"]:
            self.current_node_id = self.scenario_data["start_node_id"]

    def get_node(self, node_id):
        """
        Get a node by its ID.
        """
        return self.scenario_data.get("nodes", {}).get(node_id)

    def get_current_node(self) -> Optional[dict[str, Any]]:
        """
        Get the learner's current node.
        """
        return self.get_node(self.current_node_id) if self.current_node_id else None

    def is_end_node(self, node_id):
        """
        Check if node is a leaf node.
        """
        node = self.get_node(node_id)
        return bool(node) and not node.get("choices")

    def validate_scenario(self):
        """
        Check for common configuration errors.
        """
        errors = []
        nodes = self.scenario_data.get("nodes", {})

        if not nodes:
            errors.append("At least one node is required")
            return errors

        # Check start node exists
        start_id = self.scenario_data.get("start_node_id")
        if start_id not in nodes:
            errors.append("Start node ID does not exist")

        # Check all choice targets exist
        for node in nodes.values():
            for choice in node.get("choices", []):
                if not self.get_node(choice["target_node_id"]):
                    errors.append(f"Invalid target {choice['target_node_id']} in node {node['id']}")

        return errors

    def publish_grade(self):
        """
        Send score to gradebook.
        """
        if self.enable_scoring:
            self.runtime.publish(
                self,
                "grade",
                {"value": self.score, "max_value": self.max_score}
            )

    def resource_string(self, path):
        """
        Retrieve string contents for the file path.
        """
        path = os.path.join('static', path)
        return resource_loader.load_unicode(path)

    def get_html(self):
        """
        Retrive the HTML from the static file.

        This is required for the edxnotes decorator to inject the HTML.
        """
        return self.resource_string("html/branching_xblock.html")

    def student_view(self, context=None):
        """
        Create primary view of the BranchingXBlock, shown to students when viewing courses.
        """
        frag = Fragment(self.get_html())
        frag.add_css(self.resource_string("css/branching_xblock.css"))
        frag.add_javascript(self.resource_string("js/src/branching_xblock.js"))
        frag.initialize_js('BranchingXBlock')
        return frag

    def studio_view(self, context=None):
        """
        Studio editor view shown to course authors.
        """
        html = self.resource_string("html/branching_xblock_edit.html")
        frag = Fragment(html)

        # Add JS/CSS for Studio
        frag.add_javascript_url(
            self.runtime.local_resource_url(self, 'public/js/vendor/handlebars.js')
        )
        for tpl in ['settings-panel', 'node-block', 'choice-row']:
            html = resource_loader.load_unicode(f'static/handlebars/{tpl}.handlebars')
            frag.add_javascript(f"""
                (function() {{
                    var s = document.createElement('script');
                    s.type = 'text/x-handlebars-template';
                    s.id = '{tpl}-tpl';
                    s.innerHTML = {json.dumps(html)};
                    document.body.appendChild(s);
                }})();
            """)
        frag.add_javascript(self.resource_string("js/src/studio_editor.js"))
        frag.add_css(self.resource_string("css/studio_editor.css"))

        authoring_help_html = sanitize_html(
            get_site_configuration_value("branching_xblock", "AUTHORING_HELP_HTML") or ""
        )
        init_data = {
            "nodes": self.scenario_data.get("nodes", {}),
            "start_node_id": self.scenario_data.get("start_node_id"),
            "enable_undo": bool(self.enable_undo),
            "enable_scoring": bool(self.enable_scoring),
            "enable_hints": bool(self.enable_hints),
            "max_score":   self.max_score,
            "display_name": self.display_name,
            "authoring_help_html": authoring_help_html,
        }
        # Initialize JS
        frag.initialize_js('BranchingStudioEditor', init_data)
        return frag

    def _get_state(self):
        return {
            "nodes":           self.scenario_data.get("nodes", {}),
            "start_node_id":   self.scenario_data.get("start_node_id"),
            "enable_undo":     bool(self.enable_undo),
            "enable_scoring":  bool(self.enable_scoring),
            "enable_hints":    bool(self.enable_hints),
            "max_score":       self.max_score,
            "display_name":    self.display_name,
            "current_node":    self.get_current_node(),
            "history":         list(self.history),
            "has_completed":   bool(self.has_completed),
            "score":           self.score,
        }

    @XBlock.json_handler
    def get_current_state(self, data, suffix=''):
        """
        Fetch current state of the XBlock.
        """
        return self._get_state()

    @XBlock.json_handler
    def select_choice(self, data, suffix=''):
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
        if self.enable_undo:
            self.history.append(self.current_node_id)
        self.current_node_id = target_node_id
        if self.is_end_node(target_node_id):
            self.has_completed = True
            if self.enable_scoring:
                self.score = self.max_score
                self.publish_grade()
            self.runtime.publish(self, "completion", {"completion": 1.0})

        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def undo_choice(self, data, suffix=''):
        """
        Handle undo choice.
        """
        if not self.enable_undo or not self.history:
            return {"success": False, "error": "Undo not allowed"}

        prev_node_id = self.history.pop()
        self.current_node_id = prev_node_id

        if self.has_completed and self.enable_scoring:
            self.score = 0.0
            self.publish_grade()

        self.has_completed = False
        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        """
        Handle studio editor save.
        """
        payload = data
        raw_nodes = payload.get('nodes', [])

        # 1) Assign real IDs and build id_map
        id_map = {}
        staged = []
        for raw in raw_nodes:
            old_id = raw.get('id', '')
            # new ID if temp or missing
            if old_id.startswith('temp-') or not old_id:
                new_id = f"node-{uuid.uuid4().hex[:6]}"
            else:
                new_id = old_id
            id_map[old_id] = new_id
            # carry forward content & media, but keep raw choices for next step
            staged.append({
                'id': new_id,
                'content': raw.get('content', ''),
                'media': {
                    'type': raw.get('media', {}).get('type', ''),
                    'url':  raw.get('media', {}).get('url', '')
                },
                'choices': raw.get('choices', []),
                'hint':     raw.get('hint', ''),
                'transcript_url': raw.get('transcript_url', ''),
            })

        # 2) Remap choice targets & clean arrays
        final = []
        for node in staged:
            # filter out completely blank nodes
            has_content = bool(node['content'].strip())
            has_media = bool(node['media']['url'].strip())
            has_choices = any(
                (c.get('text', '').strip() or c.get('target_node_id', '').strip())
                for c in node['choices']
            )
            if not (has_content or has_media or has_choices):
                continue

            # remap and clean
            cleaned = []
            for raw in node['choices']:
                text = raw.get('text', '').strip()
                targ = raw.get('target_node_id', '').strip()
                # map through id_map if it was a temp ID
                real_target = id_map.get(targ, targ)
                if text or real_target:
                    cleaned.append({
                        'text': text,
                        'target_node_id': real_target
                    })

            final.append({
                'id':       node['id'],
                'type':     'start' if not final else 'normal',
                'content':  node['content'],
                'media':    node['media'],
                'choices':  cleaned,
                'hint': node.get('hint', ''),
                'transcript_url': node.get('transcript_url', ''),
            })

        # 3) Persist scenario_data & settings
        nodes_dict = {node['id']: node for node in final}
        self.scenario_data = {
            'nodes': nodes_dict,
            'start_node_id': final[0]['id'] if final else None
        }
        self.enable_undo = bool(payload.get('enable_undo', self.enable_undo))
        self.enable_scoring = bool(payload.get('enable_scoring', self.enable_scoring))
        self.enable_hints = bool(payload.get('enable_hints', self.enable_hints))
        self.max_score = float(payload.get('max_score', self.max_score))
        self.display_name = payload.get('display_name', self.display_name)

        # 4) Validate & respond
        errors = self.validate_scenario()
        if errors:
            return {
                "result": "error",
                "message": "Validation errors",
                "field_errors": {"nodes_json": errors}
            }
        return {"result": "success"}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
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
