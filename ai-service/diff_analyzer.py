from difflib import unified_diff
from typing import Dict


def analyze_diff(old_code: str, new_code: str, file_path: str = "unknown") -> Dict:
    old_lines = old_code.splitlines()
    new_lines = new_code.splitlines()

    diff_lines = list(
        unified_diff(
            old_lines,
            new_lines,
            fromfile=f"{file_path}:old",
            tofile=f"{file_path}:new",
            lineterm="",
            n=3,
        )
    )

    additions = 0
    deletions = 0
    changed_hunks = 0

    for line in diff_lines:
        if line.startswith("@@"):
            changed_hunks += 1
        elif line.startswith("+") and not line.startswith("+++"):
            additions += 1
        elif line.startswith("-") and not line.startswith("---"):
            deletions += 1

    return {
        "file_path": file_path,
        "additions": additions,
        "deletions": deletions,
        "changed_lines": additions + deletions,
        "changed_hunks": changed_hunks,
        "unified_diff": "\n".join(diff_lines),
    }
