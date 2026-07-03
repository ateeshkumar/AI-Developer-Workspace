import json
import urllib.error
import urllib.request
from typing import Tuple

from config import ANTHROPIC_MODEL, EXTERNAL_LLM_TIMEOUT_SECONDS, OPENAI_MODEL


class ExternalProviderError(RuntimeError):
    pass


def _extract_error_message(body: str) -> str:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return body.strip() or "no additional detail"

    error = parsed.get("error")
    if isinstance(error, dict) and error.get("message"):
        return str(error["message"])
    if isinstance(error, str):
        return error

    return body.strip() or "no additional detail"


def _post_json(url: str, headers: dict, payload: dict) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=EXTERNAL_LLM_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        message = _extract_error_message(body)
        if error.code in (401, 403):
            raise ExternalProviderError("The API key was rejected by the provider") from error
        if error.code == 429:
            raise ExternalProviderError(f"Rate limit or quota exceeded: {message}") from error
        raise ExternalProviderError(f"Provider request failed ({error.code}): {message}") from error
    except urllib.error.URLError as error:
        raise ExternalProviderError(f"Could not reach the provider: {error.reason}") from error


def _get(url: str, headers: dict) -> Tuple[int, str]:
    request = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(request, timeout=EXTERNAL_LLM_TIMEOUT_SECONDS) as response:
            return response.status, ""
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="ignore")
    except urllib.error.URLError as error:
        return 0, str(error.reason)


def query_claude(api_key: str, system_prompt: str, user_prompt: str) -> str:
    data = _post_json(
        "https://api.anthropic.com/v1/messages",
        {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        {
            "model": ANTHROPIC_MODEL,
            "max_tokens": 1500,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        },
    )

    blocks = data.get("content") or []
    text = "".join(block.get("text", "") for block in blocks if block.get("type") == "text").strip()

    if not text:
        raise ExternalProviderError("Claude returned an empty response")

    return text


def query_openai(api_key: str, system_prompt: str, user_prompt: str) -> str:
    data = _post_json(
        "https://api.openai.com/v1/chat/completions",
        {
            "Authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        {
            "model": OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
    )

    choices = data.get("choices") or []
    text = (choices[0].get("message", {}).get("content") if choices else "").strip()

    if not text:
        raise ExternalProviderError("Codex/OpenAI returned an empty response")

    return text


def verify_key(provider: str, api_key: str) -> None:
    if not api_key or not api_key.strip():
        raise ExternalProviderError("An API key is required")

    if provider == "claude":
        status, body = _get(
            "https://api.anthropic.com/v1/models",
            {"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        )
    elif provider == "openai":
        status, body = _get(
            "https://api.openai.com/v1/models",
            {"Authorization": f"Bearer {api_key}"},
        )
    else:
        raise ExternalProviderError(f"Unknown provider: {provider}")

    if status != 200:
        raise ExternalProviderError(f"The API key was rejected ({status or 'unreachable'}) {body}".strip())
