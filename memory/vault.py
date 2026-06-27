"""Obsidian vault integration — read, search, create, link notes."""

import logging
import re
import uuid
import json
from pathlib import Path
from datetime import datetime

from core.config import OBSIDIAN_VAULT_PATH, OBSIDIAN_AURA_FOLDER
from memory import chroma_store

logger = logging.getLogger(__name__)

_MIGRATION_SENTINEL = Path(__file__).parent.parent / "data" / ".vault_migrated"
_VINDEX_FILE = Path(__file__).parent.parent / "data" / ".vault_index.json"


def _vault_path() -> Path:
    return Path(OBSIDIAN_VAULT_PATH).expanduser()


def _aura_path() -> Path:
    return _vault_path() / OBSIDIAN_AURA_FOLDER


def init() -> bool:
    vault = _vault_path()
    if not vault.exists():
        logger.error("Obsidian vault not found at %s", vault)
        return False

    (_aura_path() / "Memory").mkdir(parents=True, exist_ok=True)

    indexed = _index_vault_files()
    logger.info("Vault initialized at %s (%d files indexed)", vault, indexed)

    if not _MIGRATION_SENTINEL.exists():
        _migrate_old_notes()
        _MIGRATION_SENTINEL.touch()
        logger.info("Old notes migrated into vault")

    return True


def _index_vault_files() -> int:
    vault = _vault_path()
    existing = _load_vindex()
    count = 0

    # Track which paths we see on disk
    seen = set()

    for md_file in vault.rglob("*.md"):
        if ".obsidian" in md_file.parts:
            continue
        rel = str(md_file.relative_to(vault))
        seen.add(rel)
        current_mtime = md_file.stat().st_mtime

        if rel in existing and existing[rel] == current_mtime:
            continue

        try:
            content = md_file.read_text(encoding="utf-8", errors="replace")
            chroma_store.index_vault_document(
                content,
                {"source": "vault", "path": rel, "filename": md_file.stem},
            )
            existing[rel] = current_mtime
            count += 1
        except Exception as e:
            logger.warning("Failed to index %s: %s", md_file, e)

    # Remove stale entries (indexed files that no longer exist on disk)
    stale = [p for p in existing if p not in seen]
    for path in stale:
        chroma_store.delete_vault_document(path)
        del existing[path]
        count += 1
        logger.debug("Removed stale vault index: %s", path)

    if count or stale:
        _save_vindex(existing)
    return count


def _load_vindex() -> dict:
    if _VINDEX_FILE.exists():
        try:
            return json.loads(_VINDEX_FILE.read_text())
        except Exception:
            pass
    return {}


def _save_vindex(data: dict) -> None:
    _VINDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    _VINDEX_FILE.write_text(json.dumps(data, indent=2))


# ── Tool API ──────────────────────────────────────────────────────────────


def search(query: str) -> dict:
    results = chroma_store.search_vault(query)
    if not results:
        return {"results": [], "count": 0}
    out = []
    for r in results:
        text = r["text"]
        # Strip YAML frontmatter
        if text.startswith("---"):
            end = text.find("---", 3)
            if end != -1:
                text = text[end + 3:].strip()
        out.append({
            "path": r["path"],
            "snippet": text[:200],
            "similarity": r["similarity"],
        })
    return {"results": out, "count": len(out)}


def _match_stem(stem: str, title: str) -> bool:
    return stem == title or stem.endswith(f"_{title}") or stem.startswith(f"{title}_")


def read(title: str) -> dict:
    vault = _vault_path()
    for md_file in vault.rglob("*.md"):
        if ".obsidian" in md_file.parts:
            continue
        if _match_stem(md_file.stem, title):
            return {
                "success": True,
                "content": md_file.read_text(encoding="utf-8"),
                "path": str(md_file.relative_to(vault)),
            }
    return {"error": f"Note '{title}' not found in vault"}


def list_notes(folder: str = None) -> dict:
    search_path = _aura_path() if folder is None else _vault_path() / folder
    if not search_path.exists():
        return {"notes": [], "count": 0}

    notes = []
    for md_file in sorted(search_path.rglob("*.md"), key=lambda f: f.stem):
        if md_file.name == "Index.md":
            continue
        vault = _vault_path()
        notes.append({
            "title": md_file.stem,
            "path": str(md_file.relative_to(vault)),
        })
    return {"notes": notes, "count": len(notes)}


def create(title: str, content: str, subfolder: str = None) -> dict:
    date_prefix = datetime.now().strftime("%Y-%m-%d")
    safe = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")
    filename = f"{date_prefix}_{safe}.md"

    target = _aura_path()
    if subfolder:
        target = target / subfolder
        target.mkdir(parents=True, exist_ok=True)

    path = target / filename

    wikilinks = _find_wikilinks(content)
    frontmatter = (
        f"---\ntags: [aura]\ndate: {date_prefix}\n---\n\n"
    )
    body = f"# {title}\n\n{content}\n"
    footer = "\n---\n"
    if wikilinks:
        footer += "Related: " + " ".join(f"[[{w}]]" for w in wikilinks) + "\n"
    footer += "[[Index]]\n"

    md = frontmatter + body + footer
    path.write_text(md, encoding="utf-8")

    _update_index()
    _index_vault_files()

    return {"success": True, "path": str(path.relative_to(_vault_path())), "title": filename}


def append(title: str, content: str) -> dict:
    vault = _vault_path()
    for md_file in (_aura_path()).rglob("*.md"):
        if _match_stem(md_file.stem, title):
            with md_file.open("a", encoding="utf-8") as f:
                f.write(f"\n\n{content}")
            _index_vault_files()
            return {"success": True, "path": str(md_file.relative_to(vault))}
    return {"error": f"Note '{title}' not found in AURA folder"}


def delete(title: str) -> dict:
    vault = _vault_path()
    for md_file in (_aura_path()).rglob("*.md"):
        if _match_stem(md_file.stem, title):
            rel = str(md_file.relative_to(vault))
            md_file.unlink()
            chroma_store.delete_vault_document(rel)
            _update_index()
            return {"success": True, "deleted": rel}
    return {"error": f"Note '{title}' not found in AURA folder"}


def reindex() -> dict:
    count = _index_vault_files()
    return {"success": True, "indexed": count}


# ── Internal helpers ─────────────────────────────────────────────────────


def _find_wikilinks(content: str) -> list[str]:
    vault = _vault_path()
    existing = {}
    for md_file in vault.rglob("*.md"):
        if ".obsidian" in md_file.parts:
            continue
        existing[md_file.stem.lower()] = md_file.stem

    links = []
    words = set(re.findall(r'\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?\b', content))
    for word in words:
        if word.lower() in existing:
            links.append(existing[word.lower()])
    return links[:5]


def _update_index() -> None:
    notes = []
    for md_file in sorted((_aura_path()).rglob("*.md"), key=lambda f: f.stem):
        if md_file.name == "Index.md":
            continue
        notes.append(f"- [[{md_file.stem}]]")

    date = datetime.now().strftime("%Y-%m-%d")
    content = (
        f"---\ntags: [aura, index]\ndate: {date}\n---\n\n"
        f"# AURA's Notes\n\n"
        f"Welcome to my corner of your brain.\n\n"
    )
    if notes:
        content += "## All Notes\n" + "\n".join(notes) + "\n"

    idx_path = _aura_path() / "Index.md"
    idx_path.write_text(content, encoding="utf-8")


def _migrate_old_notes() -> None:
    imported = _aura_path() / "Imported"
    imported.mkdir(parents=True, exist_ok=True)
    count = 0

    notes_json = Path(__file__).parent.parent / "data" / "notes.json"
    if notes_json.exists():
        try:
            entries = json.loads(notes_json.read_text(encoding="utf-8"))
            for entry in entries:
                title = entry.get("title", "untitled")
                content = entry.get("content", "")
                safe = re.sub(r"[^\w\s-]", "", title).strip().replace(" ", "_")
                path = imported / f"{safe}.md"
                if not path.exists():
                    path.write_text(
                        f"---\ntags: [imported]\n---\n\n# {title}\n\n{content}\n",
                        encoding="utf-8",
                    )
                    count += 1
        except Exception as e:
            logger.warning("Failed to migrate notes.json: %s", e)

    notes_dir = Path.home() / "Documents" / "AuraNotes"
    if notes_dir.exists():
        for txt_file in notes_dir.glob("*.txt"):
            try:
                content = txt_file.read_text(encoding="utf-8")
                path = imported / f"{txt_file.stem}.md"
                if not path.exists():
                    path.write_text(
                        f"---\ntags: [imported]\n---\n\n# {txt_file.stem}\n\n{content}\n",
                        encoding="utf-8",
                    )
                    count += 1
            except Exception as e:
                logger.warning("Failed to migrate %s: %s", txt_file, e)

    if count:
        logger.info("Migrated %d old notes into AURA/Imported/", count)

    _update_index()
    _index_vault_files()
