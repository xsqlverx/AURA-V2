"""Study tool — quiz, summarize, draft assignments using vault notes."""

import logging
from memory import vault

logger = logging.getLogger(__name__)


def study(topic: str, action: str = "quiz") -> dict:
    """Search vault for topic, read top notes, return structured content.
    The LLM uses the returned content to generate quizzes, summaries, or drafts."""
    results = vault.search(topic)
    if results["count"] == 0:
        return {
            "error": f"No notes found about '{topic}' in your vault.",
            "notes": [],
        }

    notes = []
    for r in results["results"][:3]:
        path = r["path"]
        stem = path.replace(".md", "").replace("\\", "/").split("/")[-1]
        read_result = vault.read(stem)
        if read_result.get("success"):
            notes.append({
                "path": path,
                "content": read_result["content"][:2000],
            })

    if not notes:
        return {"error": f"Found '{topic}' but couldn't read the notes.", "notes": []}

    return {
        "success": True,
        "topic": topic,
        "action": action,
        "notes": notes,
        "note_count": len(notes),
    }
