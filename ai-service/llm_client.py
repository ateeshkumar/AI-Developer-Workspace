import json
import urllib.error
import urllib.request
from typing import Any, Dict, List

from config import (
    OLLAMA_BASE_URL,
    OLLAMA_CHAT_MODEL,
    OLLAMA_EMBED_MODEL,
    OLLAMA_TIMEOUT_SECONDS,
)


class LocalModelError(RuntimeError):
    pass


def _post_json(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    request = urllib.request.Request(
        f"{OLLAMA_BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        raise LocalModelError(f"Local model request failed: {error.code} {body}") from error
    except urllib.error.URLError as error:
        raise LocalModelError(
            "Could not reach the local model server. "
            "Start Ollama and make sure it is listening on "
            f"{OLLAMA_BASE_URL}."
        ) from error


def embed_text(text: str) -> List[float]:
    payload = {"model": OLLAMA_EMBED_MODEL, "input": text}

    try:
      response = _post_json("/api/embed", payload)
      embeddings = response.get("embeddings") or []
      if embeddings and isinstance(embeddings[0], list):
          return embeddings[0]
    except LocalModelError:
      legacy = _post_json(
          "/api/embeddings",
          {"model": OLLAMA_EMBED_MODEL, "prompt": text},
      )
      embedding = legacy.get("embedding")
      if isinstance(embedding, list):
          return embedding
      raise

    raise LocalModelError("Embedding response did not contain a usable vector")


def generate_text(system_prompt: str, user_prompt: str) -> str:
    response = _post_json(
        "/api/generate",
        {
            "model": OLLAMA_CHAT_MODEL,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": False,
        },
    )

    answer = response.get("response", "").strip()
    if not answer:
        raise LocalModelError("Local model returned an empty response")

    return answer


def extract_json_block(text: str) -> Dict[str, Any]:
    stripped = text.strip()

    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise LocalModelError("Model response did not contain valid JSON")

    try:
        return json.loads(stripped[start : end + 1])
    except json.JSONDecodeError as error:
        raise LocalModelError("Model returned malformed JSON for PR review") from error
