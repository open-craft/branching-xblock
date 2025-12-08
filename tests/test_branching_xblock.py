import json
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
    assert state["score"] == 0.0


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
                "media": {"type": "image", "url": "http://img"},
                "choices": [{"text": "Go to 2", "target_node_id": "temp-2"}],
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
        "max_score": 77
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
    errs = result["field_errors"]["nodes_json"]
    assert any("Invalid target does-not-exist" in e for e in errs)


def test_lazy_initialize_and_select_choice(rf, block):
    """
    On the very first select_choice, current_node_id should be
    initialized to start_node_id and the choice applied.
    """
    block.scenario_data = {
        "nodes": {
            "n1": {"id": "n1", "type": "start", "choices": [{"text": "Next", "target_node_id": "n2"}]},
            "n2": {"id": "n2", "type": "end",   "choices": []}
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
    If enable_scoring is True, selecting the last branch
    should set has_completed and award max_score.
    """
    block.scenario_data = {
        "nodes": {
            "A": {"id": "A", "type": "start", "choices": [{"text": "→ B", "target_node_id": "B"}]},
            "B": {"id": "B", "type": "end",   "choices": []}
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
    assert block.score == pytest.approx(block.max_score)


def test_undo_choice_honors_enable_undo(rf, block):
    """
    - With enable_undo=False, undo_choice should fail.
    - With enable_undo=True, it should revert to the previous node.
    """
    block.scenario_data = {
        "nodes": {
            "start": {"id": "start", "type": "start", "choices": [{"text": "→ end", "target_node_id": "end"}]},
            "end": {"id": "end",   "type": "end",   "choices": []}
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
        "nodes": {"X": {"id": "X", "type": "start", "choices": []}},
        "start_node_id": "X"
    }
    req = rf.post("/", data=json.dumps({}), content_type="application/json")
    resp = block.get_current_state(req)
    state = json.loads(resp.body.decode('utf-8'))
    assert isinstance(state["nodes"], dict)
    for key in ("current_node", "history", "has_completed", "score"):
        assert key in state
