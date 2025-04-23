"""TO-DO: Write a description of what this XBlock is."""

import os
import uuid
from importlib import resources

from django.utils import translation
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Scope, Dict, Boolean, Float, String, List
from xblock.utils.resources import ResourceLoader

resource_loader = ResourceLoader(__name__)


class BranchingXBlock(XBlock):
    """
    Branching Scenario XBlock.

    Example node structure:
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
        ]
    }
    """
    scenario_data = Dict(
        default={
            "nodes": [],
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

    def start_node(self):
        """
        Set initial current_node_id if not set
        """
        if not self.current_node_id and self.scenario_data["start_node_id"]:
            self.current_node_id = self.scenario_data["start_node_id"]
    
    def get_node(self, node_id):
        """
        Get a node by its ID
        """
        return next(
            (node for node in self.scenario_data["nodes"] if node["id"] == node_id),
            None
        )
    
    def get_current_node(self):
        """
        Get the learner's current node
        """
        return self.get_node(self.current_node_id) if self.current_node_id else None
    
    def is_start_node(self, node_id):
        node = self.get_node(node_id)
        return node and node.get("type") == "start"
    
    def is_end_node(self, node_id):
        node = self.get_node(node_id)
        return node and node.get("type") == "end"
    
    def get_choice(self, node, choice_index):
        """
        Validate and return a choice from a node
        """
        try:
            return node["choices"][choice_index]
        except (IndexError, KeyError, TypeError):
            return None
        
    def can_undo(self):
        """
        Check if undo is allowed and possible
        """
        return self.enable_undo and len(self.history) > 0

    def get_previous_node_id(self):
        """
        Get last node from history
        """
        return self.history[-1] if self.history else None

    def validate_scenario(self):
        """
        Check for common configuration errors
        """
        errors = []
        nodes = self.scenario_data["nodes"]

        if not nodes:
            errors.append("At least one node is required")
            return errors
    
        # Check start node exists
        if not self.get_node(self.scenario_data["start_node_id"]):
            errors.append("Start node ID does not exist")
        
        if nodes[0].get("type") != "start":
            errors.append("First node must be a start node")
        if nodes[-1].get("type") != "end":
            errors.append("Last node must be an end node")
        start_node = nodes[0]
        if not start_node.get("choices"):
            errors.append("Start node must have at least one choice")
        end_node = nodes[-1]
        if end_node.get("choices"):
            errors.append("End node cannot have choices")
    
        # Check all choice targets exist
        for node in nodes:
            for choice in node.get("choices", []):
                if not self.get_node(choice["target_node_id"]):
                    errors.append(f"Invalid target {choice['target_node_id']} in node {node['id']}")
        
        return errors

    def publish_grade(self):
        """
        Send score to gradebook
        """
        if self.enable_scoring:
            self.runtime.publish(
                self,
                "grade",
                {"value": self.score, "max_value": self.max_score}
            )

    def resource_string(self, path):
        """
        Retrieve string contents for the file path
        """
        path = os.path.join('static', path)
        return resource_loader.load_unicode(path)


    def student_view(self, context=None):
        """
        Create primary view of the BranchingXBlock, shown to students when viewing courses.
        """
        html = self.resource_string("html/branching_xblock.html")
        frag = Fragment(html)
        frag.add_css(self.resource_string("css/branching_xblock.css"))
        frag.add_javascript(self.resource_string("js/src/branching_xblock.js"))
        frag.initialize_js('BranchingXBlock')
        return frag
    
    def studio_view(self, context=None):
        html = self.resource_string("html/branching_xblock_edit.html")
        frag = Fragment(html)

        # Add JS/CSS for Studio
        frag.add_javascript(self.resource_string("js/src/studio_editor.js"))
        frag.add_css(self.resource_string("css/studio_editor.css"))
        
        init_data = {
            "nodes":       self.scenario_data.get("nodes", []),
            "enable_undo": bool(self.enable_undo),
            "enable_scoring": bool(self.enable_scoring),
            "max_score":   self.max_score,
        }
        # Initialize JS
        frag.initialize_js('BranchingStudioEditor', init_data)
        return frag
    
    def _get_state(self):
        return {
            "nodes":           self.scenario_data.get("nodes", []),
            "enable_undo":     bool(self.enable_undo),
            "enable_scoring":  bool(self.enable_scoring),
            "max_score":       self.max_score,
            "current_node_id": self.current_node_id,
            "history":         list(self.history),
            "has_completed":   bool(self.has_completed),
            "score":           self.score,
        }

    @XBlock.json_handler
    def get_current_state(self, data, suffix=''):
        return self._get_state()

    @XBlock.json_handler
    def select_choice(self, data, suffix=''):
        current_node = self.get_current_node()
        choice_index = data.get("choice_index")
        if not current_node or choice_index is None:
            return {"success": False, "error": "Invalid choice"}
        if choice_index < 0 or choice_index >= len(current_node.get("choices", [])):
            return {"success": False, "error": "Invalid choice index"}
        choice = current_node["choices"][choice_index]
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
    def save_settings(self, data, suffix=''):
        self.enable_undo = data.get("enable_undo", False)
        self.enable_scoring = data.get("enable_scoring", False)
        self.max_score = float(data.get("max_score", 100.0))
        return {"success": True, **self._get_state()}
    
    @XBlock.json_handler
    def add_node(self, data, suffix=''):
        new_id = f"node-{uuid.uuid4().hex[:6]}"
        while any(n["id"] == new_id for n in self.scenario_data["nodes"]):
            new_id = f"node-{uuid.uuid4().hex[:6]}"
        new_node = {
            "id": new_id,
            "type": "normal",
            "content": "New Node",
            "media": {"type": "", "url": ""},
            "choices": [{"text": "", "target_node_id": ""}]
        }
        nodes = self.scenario_data["nodes"]
        if not nodes:
            new_node["type"] = "start"
        else:
            new_node["type"] = "end"
            for node in nodes:
                if node["type"] == "end":
                    node["type"] = "normal"

        nodes.append(new_node)
        self.scenario_data["start_node_id"] = nodes[0]["id"] if nodes else None
        return {"success": True, "node_id": new_node["id"], **self._get_state()}
    
    @XBlock.json_handler
    def save_scenario(self, data, suffix=''):
        try:
            nodes = data["nodes"]
            for i, node in enumerate(nodes):
                if i == 0:
                    node["type"] = "start"
                elif i == len(nodes) - 1:
                    node["type"] = "end"
                else:
                    node["type"] = "normal"
            self.scenario_data = {
                "nodes": nodes,
                "start_node_id": nodes[0]["id"] if nodes else None,
            }
            errors = self.validate_scenario()
            if errors:
                return {"success": False, "errors": errors}
            return {"success": True, **self._get_state()}
        except KeyError as e:
            return {"success": False, "error": f"Missing key: {e}"}
    
    @XBlock.json_handler
    def delete_node(self, data, suffix=''):
        node_id = data.get("node_id")
        if not node_id:
            return {"success": False, "error": "Missing node_id"}
        self.scenario_data["nodes"] = [
            n for n in self.scenario_data["nodes"] if n["id"] != node_id
        ]
        nodes = self.scenario_data["nodes"]
        if nodes:
            for i, node in enumerate(nodes):
                if i == 0:
                    node["type"] = "start"
                elif i == len(nodes) - 1:
                    node["type"] = "end"
                else:
                    node["type"] = "normal"
                if "choices" in node:
                    node["choices"] = [
                        choice for choice in node["choices"]
                        if choice.get("target_node_id") != node_id
                    ]
            self.scenario_data["start_node_id"] = nodes[0]["id"]
        else:
            self.scenario_data["start_node_id"] = None
        errors = self.validate_scenario()
        if errors:
            return {"success": False, "errors": errors}
        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def add_choice(self, data, suffix=''):
        node_index = data.get("node_index")
        try:
            node = self.scenario_data["nodes"][node_index]
        except (IndexError, KeyError):
            return {"success": False, "error": "Invalid node_index"}
        node.setdefault("choices", []).append({
            "text": "",
            "target_node_id": "",
        })
        return {"success": True, **self._get_state()}

    @XBlock.json_handler
    def delete_choice(self, data, suffix=''):
        """
        Remove a choice from the given node.
        Expects data = {"node_index": int, "choice_index": int}
        """
        node_index   = data.get("node_index")
        choice_index = data.get("choice_index")

        nodes = self.scenario_data["nodes"]
        if node_index is None or choice_index is None:
            return {"success": False, "error": "Missing node_index or choice_index"}
        if not (0 <= node_index < len(nodes)):
            return {"success": False, "error": "Invalid node_index"}
        if not (0 <= choice_index < len(nodes[node_index].get("choices", []))):
            return {"success": False, "error": "Invalid choice_index"}

        nodes[node_index]["choices"].pop(choice_index)

        self.scenario_data["nodes"] = nodes

        return {"success": True, **self._get_state()}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """Create canned scenario for display in the workbench."""
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
