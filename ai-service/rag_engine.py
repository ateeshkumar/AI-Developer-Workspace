from typing import Dict, List, Tuple

from config import OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL, TOP_K
from diff_analyzer import analyze_diff
from llm_client import embed_text, extract_json_block, generate_text
from repo_indexer import get_index_summary, index_repositories
from schemas import SourceChunk
import vector_store


SYSTEM_PROMPTS = {
    "query": (
        "You are a senior engineer assistant. Answer using the indexed codebase context. "
        "Be concrete, cite files and line ranges when possible, and say when something is an inference."
    ),
    "explain": (
        "You are explaining code to a teammate. Focus on behavior, architecture, "
        "data flow, and important implementation details."
    ),
    "review": (
        "You are doing a backend/frontend code review. Prioritize bugs, edge cases, regressions, "
        "security risks, and missing validation/tests."
    ),
    "refactor": (
        "You are a senior engineer proposing a refactor. Preserve behavior unless the request says otherwise, "
        "and provide concrete implementation guidance."
    ),
    "pr_review": (
        "You are a strict senior engineer reviewing a pull request. "
        "Prioritize correctness, regressions, edge cases, maintainability, and missing validation/tests. "
        "Return JSON with keys summary, bugs, suggestions. "
        "Each bug/suggestion item must have severity, category, title, details."
    ),
}


def ensure_index(include_dirs: List[str] | None = None) -> Dict:
    vector_store.initialize()
    if vector_store.chunk_count() == 0:
        return index_repositories(include_dirs=include_dirs or [])
    return get_index_summary()


def retrieve_context(question: str, top_k: int = TOP_K) -> Tuple[List[Dict], Dict]:
    summary = ensure_index()
    query_embedding = embed_text(question)
    matches = vector_store.search(query_embedding, limit=top_k)
    return matches, summary


def _render_sources(matches: List[Dict]) -> str:
    blocks = []
    for idx, match in enumerate(matches, start=1):
        blocks.append(
            (
                f"[Source {idx}] {match['repo_name']}/{match['rel_path']} "
                f"(lines {match['start_line']}-{match['end_line']})\n"
                f"{match['content']}"
            )
        )
    return "\n\n".join(blocks)


def _build_user_prompt(task: str, payload: Dict, matches: List[Dict]) -> str:
    question = payload.get("question") or ""
    target = payload.get("target") or ""
    code = payload.get("code") or ""
    diff = payload.get("diff") or ""
    instructions = payload.get("instructions") or ""
    context = _render_sources(matches)

    parts = [
        f"Task: {task}",
        f"Question: {question}",
    ]

    if target:
        parts.append(f"Target: {target}")
    if instructions:
        parts.append(f"Instructions: {instructions}")
    if code:
        parts.append(f"Provided code:\n{code}")
    if diff:
        parts.append(f"Provided diff:\n{diff}")

    parts.append("Retrieved codebase context:")
    parts.append(context or "No matching indexed context was found.")

    return "\n\n".join(parts)


def run_task(task: str, payload: Dict) -> Dict:
    query_text = payload.get("question") or payload.get("target") or payload.get("code") or payload.get("diff") or task
    matches, summary = retrieve_context(query_text, top_k=payload.get("top_k") or TOP_K)
    prompt = _build_user_prompt(task, payload, matches)
    answer = generate_text(SYSTEM_PROMPTS[task], prompt)

    sources = [
        SourceChunk(
            repo_name=item["repo_name"],
            rel_path=item["rel_path"],
            chunk_index=item["chunk_index"],
            start_line=item["start_line"],
            end_line=item["end_line"],
            score=item["score"],
            content=item["content"],
        )
        for item in matches
    ]

    return {
        "answer": answer,
        "model": OLLAMA_CHAT_MODEL,
        "embedding_model": OLLAMA_EMBED_MODEL,
        "indexed_files": summary["indexed_files"],
        "indexed_chunks": summary["indexed_chunks"],
        "sources": sources,
        "prompt_preview": prompt[:1200],
        "extra": {
            "included_roots": summary.get("included_roots", []),
            "indexed_at": summary.get("created_at"),
        },
    }


def run_pr_review(payload: Dict) -> Dict:
    old_code = payload["old_code"]
    new_code = payload["new_code"]
    file_path = payload.get("file_path") or "unknown"
    diff = analyze_diff(old_code, new_code, file_path=file_path)

    query_text = payload.get("question") or payload.get("title") or file_path or "pr review"
    matches, summary = retrieve_context(query_text, top_k=payload.get("top_k") or TOP_K)

    prompt = "\n\n".join(
        [
            f"PR title: {payload.get('title') or 'Untitled PR'}",
            f"Question: {payload.get('question') or 'Review this code like a senior engineer.'}",
            f"Target file: {file_path}",
            f"Instructions: {payload.get('instructions') or 'Focus on bugs, regressions, and actionable suggestions.'}",
            "Old code:",
            old_code,
            "New code:",
            new_code,
            "Unified diff:",
            diff["unified_diff"] or "(no diff)",
            "Retrieved codebase context:",
            _render_sources(matches) or "No matching indexed context was found.",
            (
                "Respond with JSON only in this shape: "
                '{"summary":"...",'
                '"bugs":[{"severity":"high","category":"logic","title":"...","details":"..."}],'
                '"suggestions":[{"severity":"medium","category":"maintainability","title":"...","details":"..."}]}'
            ),
        ]
    )

    raw_answer = generate_text(SYSTEM_PROMPTS["pr_review"], prompt)
    parsed = extract_json_block(raw_answer)

    return {
        "summary": parsed.get("summary", "").strip(),
        "bugs": parsed.get("bugs", []),
        "suggestions": parsed.get("suggestions", []),
        "diff": diff,
        "model": OLLAMA_CHAT_MODEL,
        "embedding_model": OLLAMA_EMBED_MODEL,
        "indexed_files": summary["indexed_files"],
        "indexed_chunks": summary["indexed_chunks"],
        "sources": [
            SourceChunk(
                repo_name=item["repo_name"],
                rel_path=item["rel_path"],
                chunk_index=item["chunk_index"],
                start_line=item["start_line"],
                end_line=item["end_line"],
                score=item["score"],
                content=item["content"],
            )
            for item in matches
        ],
        "prompt_preview": prompt[:1200],
        "extra": {
            "included_roots": summary.get("included_roots", []),
            "indexed_at": summary.get("created_at"),
            "raw_model_output": raw_answer,
        },
    }
