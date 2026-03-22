"""Common exception classes for LLM clients.

These exceptions provide a provider-agnostic interface for error handling,
allowing callers to handle errors without depending on specific LLM providers.
"""


class LLMAuthenticationError(Exception):
    """Raised when the API key is invalid or not set."""
    pass


class LLMConnectionError(Exception):
    """Raised when the LLM service is unreachable (network error, timeout)."""
    pass


class LLMResponseError(Exception):
    """Raised when the LLM returns an invalid or unparseable response."""
    pass
