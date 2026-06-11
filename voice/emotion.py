"""Emotion tag parser + TTS text cleaner.

Free Edge TTS endpoint does NOT support SSML emotion styles.
Tags are parsed and stripped before TTS so only clean text reaches the engine.
The emotion is conveyed through the LLM's word choice / sentence structure.

Kokoro supports inline [laugh] [whisper] markers natively.
"""

import re

START_TAG_RE = re.compile(r"^\[(\w+)\]\s*")
END_TAG_RE = re.compile(r"\s*\[(\w+)\]$")
ANY_BRACKET_RE = re.compile(r"\[/?\w+\]")
ACTION_RE = re.compile(r"\*[^*]+\*")

SUPPORTED = frozenset({
    "cheerful", "sad", "angry", "excited", "calm",
    "whisper", "friendly", "empathetic", "serious", "sassy",
})


def parse(text: str):
    """Extract an emotion tag from the start or end of text.
        Returns (tag, clean_text) or (None, text).
    """
    m = START_TAG_RE.match(text)
    if m:
        tag = m.group(1).lower()
        if tag in SUPPORTED:
            return tag, text[m.end():]

    m = END_TAG_RE.search(text)
    if m:
        tag = m.group(1).lower()
        if tag in SUPPORTED:
            return tag, text[:m.start()]

    return None, text


def strip_brackets(text: str) -> str:
    """Remove all bracketed [... ] and asterisk *...* markers from text."""
    text = ANY_BRACKET_RE.sub("", text)
    text = ACTION_RE.sub("", text)
    return text.strip()


def strip_tags(text: str) -> str:
    """Remove all emotion tags and bracketed content from text."""
    return strip_brackets(text)


def clean_for_tts(text: str):
    """Parse emotion + strip all brackets/actions. Returns (tag, clean_text).

    A single tag per sentence is extracted. All remaining bracketed or
    asterisk-wrapped content is removed so it never gets spoken.
    """
    tag, text = parse(text)
    text = strip_brackets(text)
    return tag, text


def wrap_edge_ssml(text: str, tag: str | None, voice: str) -> str:
    """Edge TTS free endpoint does NOT support SSML emotion styles.
    Just return clean text to avoid glitching."""
    return text


def wrap_kokoro(text: str, tag: str | None) -> str:
    """Kokoro supports some inline markers natively."""
    if tag == "whisper":
        return f"[whisper] {text}"
    return text


_SUPERTONIC_TAG_MAP = {
    "laugh": "laugh", "sigh": "sigh", "breath": "breath",
    "cry": "cry", "whisper": "whisper", "shout": "shout",
    "sing": "sing", "hum": "hum", "cough": "cough",
}


def wrap_supertonic(text: str, tag: str | None) -> str:
    """Map emotion tags to Supertonic inline expression tags."""
    if tag and tag in _SUPERTONIC_TAG_MAP:
        st_tag = _SUPERTONIC_TAG_MAP[tag]
        return f"<{st_tag}> {text}"
    return text
