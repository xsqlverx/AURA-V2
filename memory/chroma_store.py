"""ChromaDB read/write, semantic dedup, similarity filtering, CRUD, and TCP memory-access notification."""

import json
import logging
import socket
from typing import Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from core.config import (
    CHROMA_PATH,
    MEMORY_SIMILARITY_THRESHOLD,
    MEMORY_MAX_RESULTS,
    MEMORY_DEDUP_THRESHOLD,
    VAULT_SIMILARITY_THRESHOLD,
    UI_SOCKET_PORT,
)

logger = logging.getLogger(__name__)

# ── Init ─────────────────────────────────────────────────────────────────────

_embedder: Optional[SentenceTransformer] = None
_collection = None
_vault_collection = None
_VAULT_COLLECTION_NAME = "aura_vault"


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def init() -> bool:
    """
    Initialize ChromaDB and the embedding model.
    Returns True on success, False on failure.
    Call this explicitly at startup — never at module level.
    """
    global _collection, _vault_collection
    try:
        CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = client.get_or_create_collection(
            name="aura_memory",
            metadata={"hnsw:space": "cosine"},
        )
        _vault_collection = client.get_or_create_collection(
            name=_VAULT_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        _get_embedder()  # warm up the model now, not on first query
        logger.info("Memory initialized. %d memories, %d vault docs on record.",
                     _collection.count(), _vault_collection.count())
        return True
    except Exception as e:
        logger.error("Memory init failed: %s", e)
        return False


def _is_ready() -> bool:
    if _collection is None:
        logger.warning("Memory not initialized. Call memory.init() at startup.")
        return False
    return True


# ── Write ─────────────────────────────────────────────────────────────────────

def save(text: str, metadata: Optional[dict] = None) -> bool:
    """
    Save a memory. Silently skips if a near-duplicate already exists.
    Returns True if saved, False if skipped or failed.
    """
    if not _is_ready():
        return False
    try:
        embedder = _get_embedder()
        embedding = embedder.encode(text).tolist()

        # Dedup check — don't store if too similar to an existing memory
        if _collection.count() > 0:
            results = _collection.query(
                query_embeddings=[embedding],
                n_results=1,
                include=["distances"],
            )
            top_distance = results["distances"][0][0]
            similarity = 1 - top_distance  # cosine distance → similarity
            if similarity >= MEMORY_DEDUP_THRESHOLD:
                logger.debug("Skipping duplicate memory (similarity=%.3f)", similarity)
                return False

        import uuid, time
        _collection.add(
            ids=[str(uuid.uuid4())],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{**(metadata or {}), "timestamp": time.time()}],
        )
        logger.debug("Memory saved: %s", text[:60])
        return True
    except Exception as e:
        logger.error("Memory save failed: %s", e)
        return False


# ── Read ──────────────────────────────────────────────────────────────────────

def _query_raw(text: str) -> list[dict]:
    """Internal: return [{id, text, metadata, similarity}, ...] filtered by threshold."""
    if not _is_ready() or _collection.count() == 0:
        return []
    try:
        embedder = _get_embedder()
        embedding = embedder.encode(text).tolist()
        results = _collection.query(
            query_embeddings=[embedding],
            n_results=min(MEMORY_MAX_RESULTS, _collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        entries = []
        for id_, doc, metadata, distance in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            similarity = 1 - distance
            if similarity >= MEMORY_SIMILARITY_THRESHOLD:
                entries.append({
                    "id": id_,
                    "text": doc,
                    "metadata": metadata,
                    "similarity": round(similarity, 4),
                })
        return entries
    except Exception as e:
        logger.error("Memory query failed: %s", e)
        return []


def query(text: str) -> list[str]:
    """Return relevant memory texts for a given query string. Filters by threshold."""
    return [e["text"] for e in _query_raw(text)]


def get_relevant(text: str) -> list[dict]:
    """Like query() but returns [{id, text, metadata, similarity}] and fires a
    non-blocking TCP MEMORY_ACCESS notification to the socket bridge."""
    entries = _query_raw(text)
    if entries:
        _send_tcp_notification([e["id"] for e in entries])
    return entries


# ── CRUD ────────────────────────────────────────────────────────────────────

def get_all_entries() -> list[dict]:
    """Return all memories as [{id, text, metadata}, ...]."""
    if not _is_ready():
        return []
    try:
        results = _collection.get(include=["documents", "metadatas"])
        entries = []
        for id_, doc, metadata in zip(results["ids"], results["documents"], results["metadatas"]):
            entries.append({"id": id_, "text": doc, "metadata": metadata})
        return entries
    except Exception as e:
        logger.error("Failed to get all entries: %s", e)
        return []


def delete_entry(id: str) -> bool:
    """Delete a single memory by ID."""
    if not _is_ready():
        return False
    try:
        _collection.delete(ids=[id])
        logger.debug("Deleted memory: %s", id)
        return True
    except Exception as e:
        logger.error("Failed to delete memory %s: %s", id, e)
        return False


def add_entry(text: str, metadata: Optional[dict] = None) -> bool:
    """Unconditional write — no dedup. Use save() for dedup-aware writes."""
    if not _is_ready():
        return False
    try:
        import uuid
        import time
        embedder = _get_embedder()
        embedding = embedder.encode(text).tolist()
        _collection.add(
            ids=[str(uuid.uuid4())],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{**(metadata or {}), "timestamp": time.time()}],
        )
        logger.debug("Memory added: %s", text[:60])
        return True
    except Exception as e:
        logger.error("Failed to add memory: %s", e)
        return False


def update_entry(id: str, new_text: str) -> bool:
    """Update text content of a memory. Preserves original metadata.
    Uses delete + re-add with the same ID to force embedding recomputation."""
    if not _is_ready():
        return False
    try:
        existing = _collection.get(ids=[id], include=["metadatas"])
        if not existing["ids"]:
            logger.warning("No memory found with id: %s", id)
            return False
        old_metadata = existing["metadatas"][0] if existing["metadatas"] else {}

        embedder = _get_embedder()
        new_embedding = embedder.encode(new_text).tolist()
        _collection.update(
            ids=[id],
            embeddings=[new_embedding],
            documents=[new_text],
            metadatas=[old_metadata],
        )
        logger.debug("Memory updated: %s", id)
        return True
    except Exception as e:
        logger.error("Failed to update memory %s: %s", id, e)
        return False


# ── TCP notification ────────────────────────────────────────────────────────

# ── Vault Collection ─────────────────────────────────────────────────────────

def _vault_ready() -> bool:
    if _vault_collection is None:
        logger.warning("Vault collection not initialized.")
        return False
    return True


def index_vault_document(text: str, metadata: dict) -> bool:
    """Index a vault document into the aura_vault collection.
    Unconditional write (no dedup). Updates existing doc if path matches."""
    if not _vault_ready():
        return False
    try:
        embedder = _get_embedder()
        embedding = embedder.encode(text).tolist()

        import uuid, time
        doc_id = metadata.get("path", str(uuid.uuid4()))
        meta = {**metadata, "timestamp": time.time()}

        _vault_collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[meta],
        )
        logger.debug("Vault doc indexed: %s", doc_id)
        return True
    except Exception as e:
        logger.error("Vault index failed: %s", e)
        return False


def search_vault(query: str, max_results: int = 5) -> list[dict]:
    """Semantic search across indexed vault documents.
    Returns [{path, text, similarity, metadata}, ...]."""
    if not _vault_ready() or _vault_collection.count() == 0:
        return []
    try:
        embedder = _get_embedder()
        embedding = embedder.encode(query).tolist()
        n = min(max_results, _vault_collection.count())
        results = _vault_collection.query(
            query_embeddings=[embedding],
            n_results=n,
            include=["documents", "metadatas", "distances"],
        )
        entries = []
        for id_, doc, metadata, distance in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            similarity = 1 - distance
            if similarity < VAULT_SIMILARITY_THRESHOLD:
                continue
            entries.append({
                "path": id_,
                "text": doc[:500],
                "metadata": metadata,
                "similarity": round(similarity, 4),
            })
        return entries
    except Exception as e:
        logger.error("Vault search failed: %s", e)
        return []


def delete_vault_document(path: str) -> bool:
    """Remove a vault document from the index by its relative path (used as ID)."""
    if not _vault_ready():
        return False
    try:
        _vault_collection.delete(ids=[path])
        logger.debug("Vault doc deleted from index: %s", path)
        return True
    except Exception:
        return False


def _send_tcp_notification(ids: list[str]) -> None:
    """Fire-and-forget MEMORY_ACCESS message to socket bridge on port 9001.
    Never blocks the agent — 0.5 s timeout, all exceptions swallowed."""
    try:
        payload = f"MEMORY_ACCESS:{json.dumps({'ids': ids})}"
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            s.connect(("127.0.0.1", UI_SOCKET_PORT))
            s.sendall(payload.encode("utf-8"))
    except Exception:
        pass