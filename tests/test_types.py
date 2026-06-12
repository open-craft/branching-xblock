"""
Tests for the Pydantic models in branching_xblock.types.

These models are the source of truth for the generated TypeScript types,
so the key invariant is that they stay in sync with the runtime node
schema defined by _default_node().
"""
import pytest

from pydantic import ValidationError

from branching_xblock.branching_xblock import _default_node
from branching_xblock.types import (
    Choice,
    GradeRange,
    Media,
    Node,
    ScenarioData,
    ScenarioSettings,
)


def test_node_defaults_match_default_node_factory():
    """The Pydantic Node model must mirror the _default_node() schema."""
    assert Node().model_dump() == _default_node()


def test_scenario_data_round_trips_realistic_payload():
    payload = {
        "nodes": {
            "start": _default_node(
                id="start",
                content="<p>Start</p>",
                media={"type": "video", "url": "https://example.com/v.mp4", "alt": ""},
                choices=[{"text": "Go", "target_node_id": "end", "score": 50}],
                hint="A hint",
            ),
            "end": _default_node(id="end", content="<p>End</p>"),
        },
        "start_node_id": "start",
    }
    assert ScenarioData.model_validate(payload).model_dump() == payload


def test_scenario_data_defaults_to_empty_scenario():
    data = ScenarioData()
    assert data.nodes == {}
    assert data.start_node_id is None


def test_scenario_settings_defaults():
    settings = ScenarioSettings()
    assert settings.display_name == "Branching Scenario"
    assert settings.max_score == 100
    assert settings.grade_ranges == []
    assert not settings.enable_scoring


@pytest.mark.parametrize("score", [-1, 101])
def test_choice_rejects_out_of_range_score(score):
    with pytest.raises(ValidationError):
        Choice(score=score)


@pytest.mark.parametrize("field,value", [("start", -1), ("end", 101)])
def test_grade_range_rejects_out_of_range_bounds(field, value):
    with pytest.raises(ValidationError):
        GradeRange(**{field: value})


def test_media_defaults_match_default_node_media():
    assert Media().model_dump() == _default_node()["media"]
