"""
Pydantic models for the Branching XBlock data structures.

Single source of truth for data shapes used in:
1. TypeScript type generation (build time)
2. Runtime validation (future enhancement)

These replace the _default_node() factory function as the canonical
field definitions, though _default_node() remains in use for backward
compatibility with the existing validation pipeline.
"""
from typing import Optional

from pydantic import BaseModel, Field


class Choice(BaseModel):
    """A single branching choice in a scenario node."""

    text: str = ""
    target_node_id: str = ""
    score: int = Field(default=0, ge=0, le=100)


class Media(BaseModel):
    """Media configuration for a scenario node."""

    type: str = ""  # "", "image", "video", "audio"
    url: str = ""


class Node(BaseModel):
    """A single node in the branching scenario graph."""

    id: str = ""
    content: str = ""
    media: Media = Field(default_factory=Media)
    choices: list[Choice] = Field(default_factory=list)
    hint: str = ""
    left_image_url: str = ""
    right_image_url: str = ""
    left_image_alt_text: str = ""
    right_image_alt_text: str = ""
    overlay_text: bool = False
    transcript_url: str = ""


class GradeRange(BaseModel):
    """A single grade range segment for the grade report."""

    label: str = ""
    start: int = Field(default=0, ge=0, le=100)
    end: int = Field(default=100, ge=0, le=100)


class ScenarioSettings(BaseModel):
    """Scenario-level settings (mirrors XBlock content fields)."""

    display_name: str = "Branching Scenario"
    enable_undo: bool = False
    enable_scoring: bool = False
    enable_reset_activity: bool = False
    background_image_url: str = ""
    background_image_alt_text: str = ""
    background_image_is_decorative: bool = False
    max_score: int = 100
    grade_ranges: list[GradeRange] = Field(default_factory=list)


class ScenarioData(BaseModel):
    """Top-level scenario payload stored in the XBlock's scenario_data field."""

    nodes: dict[str, Node] = Field(default_factory=dict)
    start_node_id: Optional[str] = None
