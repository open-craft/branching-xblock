from types import SimpleNamespace
from unittest import mock

from branching_xblock import compat


def test_get_site_configuration_value():
    with mock.patch.object(
        compat.settings, "SERVICE_VARIANT", "lms", create=True
    ), mock.patch.object(
        compat, "_get_current_site_configuration_value", return_value={"FIRST_NODE_HTML": "<p>x</p>"}
    ) as get_current, mock.patch.object(
        compat, "_get_site_configuration_value"
    ) as get_for_domain:
        assert compat.get_site_configuration_value("branching_xblock", "FIRST_NODE_HTML") == "<p>x</p>"
        get_current.assert_called_once_with("branching_xblock", {})
        get_for_domain.assert_not_called()


def test_sanitize_html_uses_bleach_defaults():
    calls = {}

    def fake_clean(value, tags, attributes, strip):
        calls["value"] = value
        calls["tags"] = tags
        calls["attributes"] = attributes
        calls["strip"] = strip
        return "CLEANED"

    with mock.patch.object(compat, "bleach", SimpleNamespace(clean=fake_clean)):
        assert compat.sanitize_html("<b>ok</b>") == "CLEANED"

    assert calls["value"] == "<b>ok</b>"
    assert calls["tags"] == compat.DEFAULT_ALLOWED_TAGS
    assert calls["attributes"] == compat.DEFAULT_ALLOWED_ATTRIBUTES
    assert calls["strip"] is True

