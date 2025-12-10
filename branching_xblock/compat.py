"""
Compatibility helpers for optional Open edX imports and sanitization.
"""
from html import escape
from typing import Any
from django.conf import settings

try:
    import bleach
except Exception:  # pragma: no cover - fallback if bleach isn't installed
    bleach = None


DEFAULT_ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "b"
    "em",
    "u",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "ul",
    "ol",
    "li",
    "a",
]

DEFAULT_ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
}


def _get_current_site_configuration_value(key: str, default: Any = None) -> Any:  # pragma: no cover
    """
    Get value from the current site configuration.

    Args:
        key: The key to retrieve from the site configuration.
        default: The default value to return if the key is not found.
    Returns:
        The value associated with the key, or the default value.
    """
    # pylint: disable=import-error,import-outside-toplevel
    from openedx.core.djangoapps.site_configuration.helpers import get_value

    return get_value(key, default)


def _get_site_configuration_value(domain: str, key: str, default: Any = None) -> Any:  # pragma: no cover
    """
    Get value from the site configuration for a given domain.

    Args:
        domain: The domain to retrieve site configuration for.
        key: The key to retrieve from the site configuration.
        default: The default value to return if the key is not found.

    Returns:
        The value associated with the key, or the default value.
    """
    # pylint: disable=import-error,import-outside-toplevel
    from openedx.core.djangoapps.site_configuration.models import SiteConfiguration

    try:
        config = SiteConfiguration.objects.get(site__domain=domain).site_values
        return config.get(key, default)
    except SiteConfiguration.DoesNotExist:
        return default


def get_site_configuration_value(block_settings_key: str, config_key: str) -> str | None:
    """
    Retrieve configuration value from site configuration based on execution context.

    In Open edX, site configurations are defined separately for LMS and CMS (Studio)
    environments. API keys are typically stored in the LMS site configuration.
    This function handles the different contexts:

    In LMS: Get the API key directly from the current site configuration.
    In CMS: Get the API key using LMS site configuration.
        The LMS domain is retrieved from CMS site configuration or Django settings.

    This special handling is necessary because when an XBlock is being edited in Studio,
    it needs to access API keys that are stored in the corresponding LMS site configuration,
    not in the Studio site configuration.

    Args:
        block_settings_key: The key under which block settings are stored.
        config_key: Configuration key to retrieve.

    Returns:
        The configuration value if found, None otherwise.
    """
    if getattr(settings, "SERVICE_VARIANT", None) == "lms":
        block_config = _get_current_site_configuration_value(block_settings_key, {})
        return block_config.get(config_key)

    lms_base = _get_current_site_configuration_value("LMS_BASE", getattr(settings, "LMS_BASE", None))
    block_config = _get_site_configuration_value(lms_base, block_settings_key, {})
    return block_config.get(config_key)


def sanitize_html(
    value: str,
    allowed_tags=None,
    allowed_attributes=None,
):
    """
    Sanitize HTML to a safe subset to avoid script injection.
    """
    if not value:
        return ""

    if bleach:
        return bleach.clean(
            value,
            tags=allowed_tags or DEFAULT_ALLOWED_TAGS,
            attributes=allowed_attributes or DEFAULT_ALLOWED_ATTRIBUTES,
            strip=True,
        )

    # Minimal fallback: escape everything if bleach is unavailable.
    return escape(value)
