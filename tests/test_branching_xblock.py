import json
from unittest import mock

import pytest

from django.test.client import RequestFactory
from xblock.test.tools import TestRuntime
from xblock.field_data import DictFieldData

from branching_xblock.branching_xblock import BranchingXBlock


@pytest.fixture
def rf():
    """A Django RequestFactory for building POST requests."""
    return RequestFactory()


@pytest.fixture
def runtime():
    """A TestRuntime for constructing XBlock instances."""
    rt = TestRuntime()
    rt._services['field-data'] = DictFieldData({})
    rt.publish = lambda *args, **kwargs: None
    rt.handler_url = lambda block, handler_name, *args, **kwargs: f"/handler/{handler_name}"
    return rt


@pytest.fixture
def scope_ids():
    return {
        "user_id": "test-user",
        "org_id": "test-org",
        "course_id": "test-course",
        "block_id": "test-block",
    }


@pytest.fixture
def block(runtime, scope_ids):
    """Construct a fresh BranchingXBlock with an empty scenario."""
    return runtime.construct_xblock_from_class(
        BranchingXBlock,
        scope_ids=scope_ids
    )


@pytest.fixture(autouse=True)
def _mock_site_config():
    """
    Prevent tests from depending on compat.py/site configuration lookups.
    """
    with mock.patch(
        "branching_xblock.branching_xblock.get_site_configuration_value",
        return_value="",
    ):
        yield


def test_get_current_state_empty(rf, block):
    """
    When no nodes have been saved, get_current_state should
    return an empty nodes list and current_node None.
    """
    req = rf.post(
        "/", data=json.dumps({}), content_type="application/json"
    )
    resp = block.get_current_state(req)
    state = json.loads(resp.body.decode('utf-8'))
    assert state["nodes"] == {}
    assert state["current_node"] is None
    assert state["has_completed"] is False
    assert state["score"] == 0


def test_studio_submit_creates_scenario(rf, block):
    """
    studio_submit should remap temp IDs, persist all nodes,
    set start_node_id, and drop only completely blank placeholders.
    """
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "First node",
                "media": {"type": "image", "url": ""},
                "left_image_url": "http://img",
                "right_image_url": "",
                "choices": [{"text": "Go to 2", "target_node_id": "temp-2", "score": 77}],
                "transcript_url": ""
            },
            {
                "id": "temp-2",
                "content": "Second node",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "http://example.com/t.vtt"
            }
        ],
        "enable_undo": True,
        "enable_scoring": True,
        "max_score": 0
    }
    req = rf.post(
        "/", data=json.dumps(payload), content_type="application/json"
    )
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode('utf-8'))
    assert result["result"] == "success"

    nodes = block.scenario_data["nodes"]
    assert isinstance(nodes, dict)
    node_list = list(nodes.values())
    first_node = node_list[0]
    second_node = node_list[1]
    assert block.scenario_data["start_node_id"] == first_node["id"]
    assert first_node["choices"][0]["target_node_id"] == second_node["id"]
    assert second_node["transcript_url"] == "http://example.com/t.vtt"
    assert block.enable_undo is True
    assert block.enable_scoring is True
    assert block.max_score == 77


def test_studio_submit_computes_max_score_from_best_path(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [
                    {"text": "to A", "target_node_id": "temp-2", "score": 10},
                    {"text": "to B", "target_node_id": "temp-3", "score": 20},
                ],
                "transcript_url": "",
            },
            {
                "id": "temp-2",
                "content": "A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to End1", "target_node_id": "temp-4", "score": 30}],
                "transcript_url": "",
            },
            {
                "id": "temp-3",
                "content": "B",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to End2", "target_node_id": "temp-5", "score": 15}],
                "transcript_url": "",
            },
            {
                "id": "temp-4",
                "content": "End 1",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
            {
                "id": "temp-5",
                "content": "End 2",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": True,
        "max_score": 0,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "success"
    assert block.max_score == 40


def test_studio_submit_rejects_invalid_choice_score(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "temp-2", "score": "1.5"}],
                "transcript_url": "",
            },
            {
                "id": "temp-2",
                "content": "End",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": True,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    assert (
        result["field_errors"]["node_input_errors"]["temp-1"]["choiceScoreByIndex"]["0"]
        == "Score must be an integer between 0 and 100."
    )
    assert "nodes_json" not in result["field_errors"]


def test_studio_submit_normalizes_choice_score_from_string(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "temp-2", "score": "7"}],
                "transcript_url": "",
            },
            {
                "id": "temp-2",
                "content": "End",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": True,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "success"
    saved_nodes = block.scenario_data["nodes"]
    first_node = next(node for node in saved_nodes.values() if node["choices"])
    assert first_node["choices"][0]["score"] == 7
    assert block.max_score == 7


def test_normalize_scenario_nodes_preserves_non_empty_invalid_scores(block):
    block.scenario_data = {
        "nodes": {
            "A": {
                "id": "A",
                "choices": [
                    {"text": "to B", "target_node_id": "B", "score": "1.5"},
                    {"text": "to B", "target_node_id": "B", "score": "101"},
                ],
            },
            "B": {"id": "B", "choices": []},
        },
        "start_node_id": "A",
    }

    block._normalize_scenario_nodes()
    node_a = block.scenario_data["nodes"]["A"]
    assert node_a["choices"][0]["score"] == "1.5"
    assert node_a["choices"][1]["score"] == "101"


def test_normalize_scenario_nodes_defaults_empty_scores_to_zero(block):
    block.scenario_data = {
        "nodes": {
            "A": {
                "id": "A",
                "choices": [
                    {"text": "to B", "target_node_id": "B"},
                    {"text": "to B", "target_node_id": "B", "score": ""},
                    {"text": "to B", "target_node_id": "B", "score": "   "},
                    {"text": "to B", "target_node_id": "B", "score": None},
                ],
            },
            "B": {"id": "B", "choices": []},
        },
        "start_node_id": "A",
    }

    block._normalize_scenario_nodes()
    node_a = block.scenario_data["nodes"]["A"]
    assert node_a["choices"][0]["score"] == 0
    assert node_a["choices"][1]["score"] == 0
    assert node_a["choices"][2]["score"] == 0
    assert node_a["choices"][3]["score"] == 0


def test_studio_submit_persists_enable_reset_activity(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start node",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
        "enable_reset_activity": True,
        "max_score": 0,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))
    assert result["result"] == "success"
    assert block.enable_reset_activity is True


def test_studio_submit_persists_grade_ranges(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start node",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": True,
        "grade_ranges": [
            {"label": "Fail", "start": 0, "end": 59},
            {"label": "Pass", "start": 60, "end": 100},
        ],
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))
    assert result["result"] == "success"
    assert block.grade_ranges == [
        {"label": "Fail", "start": 0, "end": 59},
        {"label": "Pass", "start": 60, "end": 100},
    ]


def test_studio_submit_rejects_invalid_grade_ranges(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start node",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": True,
        "grade_ranges": [
            {"label": "Fail", "start": 0, "end": 49},
            {"label": "Pass", "start": 70, "end": 100},
        ],
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))
    assert result["result"] == "error"
    assert "Grade range" in result["field_errors"]["settings_field_errors"]["grade_ranges"]


def test_studio_submit_persists_display_name(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "First node",
                "media": {"type": "", "url": ""},
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
        "max_score": 0,
        "display_name": "My Branching Scenario",
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))
    assert result["result"] == "success"
    assert block.display_name == "My Branching Scenario"


def test_studio_submit_preserves_image_only_node(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "",
                "media": {"type": "image", "url": ""},
                "left_image_url": "https://example.com/left.png",
                "right_image_url": "",
                "choices": [],
                "transcript_url": "",
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
        "max_score": 0,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "success"
    nodes = block.scenario_data["nodes"]
    assert len(nodes) == 1
    saved_node = next(iter(nodes.values()))
    assert saved_node["left_image_url"] == "https://example.com/left.png"


def test_get_current_state_includes_display_name(rf, block):
    block.scenario_data = {
        "nodes": {"X": {"id": "X", "choices": []}},
        "start_node_id": "X",
    }
    block.display_name = "Scenario Title"
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.get_current_state(req)
    state = json.loads(resp.body.decode("utf-8"))
    assert state["display_name"] == "Scenario Title"


def test_studio_submit_fails_on_invalid_target(rf, block):
    """
    If a choice points to a node-ID that isn't in the draft,
    studio_submit should return an error and list it in field_errors.
    """
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Only node",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Nowhere", "target_node_id": "does-not-exist"}]
            }
        ],
        "enable_undo": False,
        "enable_scoring": False,
        "max_score": 0
    }
    req = rf.post(
        "/", data=json.dumps(payload), content_type="application/json"
    )
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode('utf-8'))
    assert result["result"] == "error"
    assert (
        result["field_errors"]["node_input_errors"]["temp-1"]["choiceDestinationByIndex"]["0"]
        == "Selected destination is invalid."
    )


def test_studio_submit_rejects_cycle(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "temp-2"}],
            },
            {
                "id": "temp-2",
                "content": "Node B",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to A", "target_node_id": "temp-1"}],
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    node_errors = result["field_errors"]["node_action_errors"]
    assert node_errors["temp-1"]["title"] == "Circular path detected"
    assert "links back through branching choices" in node_errors["temp-1"]["detail"]
    assert node_errors["temp-2"]["title"] == "Circular path detected"
    assert "links back through branching choices" in node_errors["temp-2"]["detail"]


def test_studio_submit_rejects_self_loop(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "loop", "target_node_id": "temp-1"}],
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    node_errors = result["field_errors"]["node_action_errors"]
    assert node_errors["temp-1"]["title"] == "Circular path detected"
    assert "links back through branching choices" in node_errors["temp-1"]["detail"]


def test_studio_submit_rejects_missing_choice_destination(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Go somewhere", "target_node_id": "", "score": 10}],
            },
            {
                "id": "temp-2",
                "content": "Node B",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ],
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    assert (
        result["field_errors"]["node_input_errors"]["temp-1"]["choiceDestinationByIndex"]["0"]
        == "Required field"
    )


def test_studio_submit_rejects_deleting_referenced_node_with_node_action_errors(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "temp-2", "score": 5}],
            },
            {
                "id": "temp-2",
                "content": "Node B",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ],
        "deleted_node_ids": ["temp-2"],
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    assert (
        result["field_errors"]["node_input_errors"]["temp-1"]["choiceDestinationByIndex"]["0"]
        == "Selected destination is pending deletion."
    )
    node_errors = result["field_errors"]["node_action_errors"]
    assert node_errors["temp-2"]["title"] == "You can't delete this node"
    assert "referenced by Node" in node_errors["temp-2"]["detail"]


def test_studio_submit_rejects_image_node_without_any_image_urls(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "image", "url": ""},
                "left_image_url": "",
                "right_image_url": "",
                "choices": [],
            },
        ],
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    assert result["field_errors"]["node_input_errors"]["temp-1"]["left_image_url"] == "Please enter a valid URL"


def test_studio_submit_rejects_missing_background_alt_text_with_structured_field_error(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ],
        "background_image_url": "https://example.com/bg.png",
        "background_image_alt_text": "",
        "background_image_is_decorative": False,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "error"
    assert "background_image_alt_text" in result["field_errors"]["settings_field_errors"]


def test_studio_submit_accepts_acyclic_graph(rf, block):
    payload = {
        "nodes": [
            {
                "id": "temp-1",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "temp-2"}],
            },
            {
                "id": "temp-2",
                "content": "Node B",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to C", "target_node_id": "temp-3"}],
            },
            {
                "id": "temp-3",
                "content": "Node C",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "success"


def test_studio_submit_handles_non_string_node_id(rf, block):
    payload = {
        "nodes": [
            {
                "id": 123,
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ],
        "enable_undo": False,
        "enable_scoring": False,
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.studio_submit(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["result"] == "success"
    saved_nodes = block.scenario_data["nodes"]
    assert len(saved_nodes) == 1
    node_id = next(iter(saved_nodes.keys()))
    assert isinstance(node_id, str)
    assert node_id.startswith("node-")


def test_lazy_initialize_and_select_choice(rf, block):
    """
    On the very first select_choice, current_node_id should be
    initialized to start_node_id and the choice applied.
    """
    block.scenario_data = {
        "nodes": {
            "n1": {"id": "n1", "choices": [{"text": "Next", "target_node_id": "n2"}]},
            "n2": {"id": "n2", "choices": []}
        },
        "start_node_id": "n1"
    }
    req = rf.post(
        "/", data=json.dumps({"choice_index": 0}), content_type="application/json"
    )
    resp = block.select_choice(req)
    result = json.loads(resp.body.decode('utf-8'))
    assert result["success"] is True
    assert block.current_node_id == "n2"


def test_select_choice_scores_and_completes(rf, block):
    """
    If enable_scoring is True, selecting a branch should
    add that branch's score and complete when ending node is reached.
    """
    block.scenario_data = {
        "nodes": {
            "A": {"id": "A", "choices": [{"text": "→ B", "target_node_id": "B", "score": 12}]},
            "B": {"id": "B", "choices": []}
        },
        "start_node_id": "A"
    }
    block.enable_scoring = True
    req = rf.post(
        "/", data=json.dumps({"choice_index": 0}), content_type="application/json"
    )
    resp = block.select_choice(req)
    result = json.loads(resp.body.decode('utf-8'))
    assert result["success"] is True
    assert block.current_node_id == "B"
    assert block.has_completed is True
    assert block.score_history == [12]
    assert result["score"] == 12
    assert block.choice_history == [
        {
            "source_node_id": "A",
            "choice_text": "→ B",
            "awarded_points": 12,
        }
    ]


def test_select_choice_rejects_boolean_score_values(rf, block):
    block.scenario_data = {
        "nodes": {
            "A": {"id": "A", "choices": [{"text": "→ B", "target_node_id": "B", "score": True}]},
            "B": {"id": "B", "choices": []},
        },
        "start_node_id": "A",
    }
    block.enable_scoring = True
    req = rf.post(
        "/", data=json.dumps({"choice_index": 0}), content_type="application/json"
    )
    resp = block.select_choice(req)
    result = json.loads(resp.body.decode('utf-8'))

    assert result["success"] is False
    assert result["error"] == "Invalid choice score"
    assert block.current_node_id == "A"
    assert block.has_completed is False
    assert block.score_history == []
    assert result.get("score", 0) == 0
    assert block.choice_history == []


def test_undo_choice_honors_enable_undo(rf, block):
    """
    - With enable_undo=False, undo_choice should fail.
    - With enable_undo=True, it should revert to the previous node.
    """
    block.scenario_data = {
        "nodes": {
            "start": {"id": "start", "choices": [{"text": "→ end", "target_node_id": "end"}]},
            "end": {"id": "end", "choices": []}
        },
        "start_node_id": "start"
    }
    block.enable_undo = True
    req1 = rf.post(
        "/", data=json.dumps({"choice_index": 0}), content_type="application/json"
    )
    block.select_choice(req1)
    undo_req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.undo_choice(undo_req)
    resp_ok = json.loads(resp.body.decode('utf-8'))
    assert resp_ok["success"] is True
    assert block.current_node_id == "start"

    block.enable_undo = False
    block.select_choice(req1)
    resp = block.undo_choice(undo_req)
    resp_fail = json.loads(resp.body.decode('utf-8'))
    assert resp_fail["success"] is False


def test_undo_choice_reverts_choice_history(rf, block):
    block.scenario_data = {
        "nodes": {
            "start": {
                "id": "start",
                "choices": [{"text": "to end", "target_node_id": "end", "score": 10}],
            },
            "end": {"id": "end", "choices": []},
        },
        "start_node_id": "start",
    }
    block.enable_undo = True
    block.enable_scoring = True

    choose_req = rf.post("/", data=json.dumps({"choice_index": 0}), content_type="application/json")
    block.select_choice(choose_req)
    assert len(block.choice_history) == 1

    undo_req = rf.post("/", data=json.dumps({}), content_type="application/json")
    block.undo_choice(undo_req)
    assert block.choice_history == []


def test_reset_activity_requires_enable_reset_activity(rf, block):
    block.scenario_data = {
        "nodes": {"start": {"id": "start", "choices": []}},
        "start_node_id": "start",
    }
    block.enable_reset_activity = False
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.reset_activity(req)
    result = json.loads(resp.body.decode("utf-8"))
    assert result["success"] is False
    assert result["error"] == "Reset not allowed"


def test_reset_activity_clears_progress_and_score(rf, block):
    block.scenario_data = {
        "nodes": {
            "start": {
                "id": "start",
                "choices": [{"text": "Next", "target_node_id": "end"}],
            },
            "end": {"id": "end", "choices": []},
        },
        "start_node_id": "start",
    }
    block.enable_reset_activity = True
    block.enable_scoring = True
    block.current_node_id = "end"
    block.history = ["start"]
    block.has_completed = True
    block.score_history = [42]
    block.choice_history = [{"source_node_id": "start", "choice_text": "Next", "awarded_points": 42}]
    req = rf.post("/", data=json.dumps({}), content_type="application/json")

    resp = block.reset_activity(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    assert block.current_node_id == "start"
    assert block.history == []
    assert block.has_completed is False
    assert block.score_history == []
    assert block.choice_history == []
    assert result["current_node"]["id"] == "start"
    assert result["has_completed"] is False
    assert result["score"] == 0


def test_reset_activity_clears_scoring_state_when_scoring_disabled(rf, block):
    block.scenario_data = {
        "nodes": {
            "start": {"id": "start", "choices": []},
        },
        "start_node_id": "start",
    }
    block.enable_reset_activity = True
    block.enable_scoring = False
    block.current_node_id = "start"
    block.history = ["start"]
    block.has_completed = True
    block.score_history = [12]
    block.choice_history = [{"source_node_id": "start", "choice_text": "A", "awarded_points": 12}]

    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.reset_activity(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    assert block.score_history == []
    assert block.choice_history == []


def test_get_current_state_includes_grade_report_data(rf, block):
    block.grade_ranges = [
        {"label": "Fail", "start": 0, "end": 49},
        {"label": "Pass", "start": 50, "end": 100},
    ]
    block.max_score = 200
    block.score_history = [80, 80]
    block.choice_history = [
        {"source_node_id": "n1", "choice_text": "Choice 1", "awarded_points": 80},
        {"source_node_id": "n2", "choice_text": "Choice 2", "awarded_points": 80},
    ]
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.get_current_state(req)
    state = json.loads(resp.body.decode("utf-8"))

    assert "grade_report" in state
    assert state["grade_report"]["percentage"] == 80
    assert state["grade_report"]["grade_label"] == "Pass"
    assert state["grade_report"]["is_pass_style"] is True
    assert state["grade_report"]["detailed_scores"][0]["choice_text"] == "Choice 1"


def test_get_current_state_includes_expected_fields(rf, block):
    """
    get_current_state should return a dict containing:
    - nodes (dict)
    - current_node (dict or None)
    - history (list)
    - has_completed (bool)
    - score (float)
    """
    block.scenario_data = {
        "nodes": {"X": {"id": "X", "choices": []}},
        "start_node_id": "X"
    }
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.get_current_state(req)
    state = json.loads(resp.body.decode('utf-8'))
    assert isinstance(state["nodes"], dict)
    for key in (
        "current_node",
        "history",
        "has_completed",
        "score",
        "start_node_id",
        "enable_reset_activity",
        "grade_ranges",
    ):
        assert key in state


def test_studio_view_passes_authoring_help_html_in_init_data(block):
    calls = {}

    def fake_initialize_js(_self, name, init_data):
        calls["name"] = name
        calls["init_data"] = init_data

    with mock.patch(
        "branching_xblock.branching_xblock.get_site_configuration_value",
        side_effect=lambda _domain, key: "<p>Help</p>" if key == "AUTHORING_HELP_HTML" else "",
    ), mock.patch(
        "branching_xblock.branching_xblock.sanitize_html",
        side_effect=lambda v: v,
    ), mock.patch(
        "branching_xblock.branching_xblock.Fragment.initialize_js",
        autospec=True,
        side_effect=fake_initialize_js,
    ), mock.patch.object(
        block.runtime,
        "local_resource_url",
        return_value="http://example.com/handlebars.js",
    ):
        block.studio_view({})

    assert calls["name"] == "BranchingStudioEditor"
    assert calls["init_data"]["meta"]["authoring_help_html"] == "<p>Help</p>"


def test_studio_view_includes_enable_reset_activity_in_init_data(block):
    calls = {}

    def fake_initialize_js(_self, name, init_data):
        calls["name"] = name
        calls["init_data"] = init_data

    block.enable_reset_activity = True

    with mock.patch(
        "branching_xblock.branching_xblock.Fragment.initialize_js",
        autospec=True,
        side_effect=fake_initialize_js,
    ), mock.patch.object(
        block.runtime,
        "local_resource_url",
        return_value="http://example.com/handlebars.js",
    ):
        block.studio_view({})

    assert calls["name"] == "BranchingStudioEditor"
    assert calls["init_data"]["initial_state"]["enable_reset_activity"] is True


def test_studio_view_includes_grade_ranges_in_init_data(block):
    calls = {}

    def fake_initialize_js(_self, name, init_data):
        calls["name"] = name
        calls["init_data"] = init_data

    block.grade_ranges = [
        {"label": "Fail", "start": 0, "end": 59},
        {"label": "Pass", "start": 60, "end": 100},
    ]

    with mock.patch(
        "branching_xblock.branching_xblock.Fragment.initialize_js",
        autospec=True,
        side_effect=fake_initialize_js,
    ), mock.patch.object(
        block.runtime,
        "local_resource_url",
        return_value="http://example.com/handlebars.js",
    ):
        block.studio_view({})

    assert calls["name"] == "BranchingStudioEditor"
    assert calls["init_data"]["initial_state"]["grade_ranges"] == block.grade_ranges


# ------------------------------------------------------------------
# Import / Export tests
# ------------------------------------------------------------------


def test_export_nodes_returns_ordered_list(rf, block):
    """export_nodes should return nodes as an ordered array, start node first."""
    block.scenario_data = {
        "nodes": {
            "node-b": {"id": "node-b", "content": "End", "choices": [], "media": {"type": "", "url": ""}},
            "node-a": {"id": "node-a", "content": "Start",
                       "choices": [{"text": "Go", "target_node_id": "node-b", "score": 10}],
                       "media": {"type": "", "url": ""}},
        },
        "start_node_id": "node-a",
    }
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.export_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    assert len(result["nodes"]) == 2
    assert result["nodes"][0]["id"] == "node-a"
    assert result["nodes"][1]["id"] == "node-b"


def test_export_nodes_empty_scenario(rf, block):
    """export_nodes should return an error when no nodes exist."""
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.export_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "No nodes" in result["error"]


def test_import_nodes_success(rf, block):
    """import_nodes should accept valid JSON, remap IDs, and persist."""
    payload = {
        "nodes": [
            {
                "id": "start",
                "content": "Hello",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Next", "target_node_id": "end", "score": 42}],
            },
            {
                "id": "end",
                "content": "Goodbye",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    nodes = block.scenario_data["nodes"]
    assert len(nodes) == 2
    for node_id in nodes:
        assert node_id.startswith("node-")
    start = block.scenario_data["start_node_id"]
    assert start in nodes
    assert nodes[start]["content"] == "Hello"
    target = nodes[start]["choices"][0]["target_node_id"]
    assert target in nodes
    assert nodes[target]["content"] == "Goodbye"


def test_import_nodes_rejects_missing_nodes_key(rf, block):
    """import_nodes should reject payloads without a nodes array."""
    payload = {"not_nodes": []}
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "nodes" in result["error"].lower()


def test_import_nodes_rejects_too_many_nodes(rf, block):
    payload = {
        "nodes": [
            {"id": f"n{i}", "content": f"Node {i}", "media": {"type": "", "url": ""}, "choices": []}
            for i in range(31)
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "maximum of 30" in result["error"]


def test_import_nodes_rejects_missing_target(rf, block):
    payload = {
        "nodes": [
            {
                "id": "start",
                "content": "Hello",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Go", "target_node_id": "nonexistent"}],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "non-existent node" in result["error"]


def test_import_nodes_rejects_cycle(rf, block):
    payload = {
        "nodes": [
            {
                "id": "a",
                "content": "Node A",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to B", "target_node_id": "b"}],
            },
            {
                "id": "b",
                "content": "Node B",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "to A", "target_node_id": "a"}],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "circular" in result["error"].lower()


def test_import_nodes_rejects_duplicate_ids(rf, block):
    payload = {
        "nodes": [
            {"id": "a", "content": "First", "media": {"type": "", "url": ""}, "choices": []},
            {"id": "a", "content": "Duplicate", "media": {"type": "", "url": ""}, "choices": []},
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "Duplicate" in result["error"]


def test_import_nodes_rejects_invalid_score(rf, block):
    payload = {
        "nodes": [
            {
                "id": "a",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Go", "target_node_id": "b", "score": 150}],
            },
            {
                "id": "b",
                "content": "End",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is False
    assert "score" in result["error"].lower()


def test_import_nodes_sanitizes_html_content(rf, block):
    payload = {
        "nodes": [
            {
                "id": "start",
                "content": '<p>Hello</p><script>alert("xss")</script>',
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    node = list(block.scenario_data["nodes"].values())[0]
    assert "<script>" not in node["content"]


def test_import_nodes_recomputes_max_score(rf, block):
    block.enable_scoring = True
    payload = {
        "nodes": [
            {
                "id": "s",
                "content": "Start",
                "media": {"type": "", "url": ""},
                "choices": [{"text": "Go", "target_node_id": "e", "score": 75}],
            },
            {
                "id": "e",
                "content": "End",
                "media": {"type": "", "url": ""},
                "choices": [],
            },
        ]
    }
    req = rf.post("/", data=json.dumps(payload), content_type="application/json")
    resp = block.import_nodes(req)
    result = json.loads(resp.body.decode("utf-8"))

    assert result["success"] is True
    assert block.max_score == 75


def test_start_node_resets_stale_learner_state(block):
    """If current_node_id references a node that no longer exists, reset learner."""
    block.scenario_data = {
        "nodes": {"new-start": {"id": "new-start", "choices": []}},
        "start_node_id": "new-start",
    }
    block.current_node_id = "deleted-node-id"
    block.history = ["some-old-node"]
    block.score_history = [10]
    block.choice_history = [{"source_node_id": "x", "choice_text": "y", "awarded_points": 10}]
    block.has_completed = True

    block.start_node()

    assert block.current_node_id == "new-start"
    assert block.history == []
    assert block.score_history == []
    assert block.choice_history == []
    assert block.has_completed is False
