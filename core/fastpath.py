"""Fast-path bypass for instant execution of simple operations.

Intercepts common patterns like "open X", "create file", "go to URL" and executes
them DIRECTLY without LLM inference. Reduces latency from 1-3s to <100ms.

This runs BEFORE the LLM router — if a pattern matches, it executes synchronously.
Complex requests fall through to the normal agent loop.
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# ── Pattern Matching ──────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    return re.sub(r'\s+', ' ', text.lower().strip().rstrip('?.!,;:'))


def _strip_casual_prefix(text: str) -> str:
    """Remove casual speech prefixes to extract the core command.
    
    Handles:
    - "can you open youtube" → "open youtube"
    - "hey can you open youtube" → "open youtube"
    - "please open youtube" → "open youtube"
    - "orang can you open youtube" → "open youtube"
    - "aura open youtube" → "open youtube"
    """
    # Remove casual prefixes and filler words
    prefixes = r'^(?:hey\s+)?(?:(?:orang|aura|can you|could you|would you|please|pls)\s+)*'
    return re.sub(prefixes, '', text, flags=re.IGNORECASE).strip()


def _extract_url(text: str) -> Optional[str]:
    """Extract URL from 'open X', 'go to X', etc.
    
    Handles:
    - open youtube.com → https://youtube.com
    - open youtube results for X → https://www.youtube.com/results?search_query=X
    - go to google → https://google.com
    - visit github → https://github.com
    """
    # Remove prefixes
    text = re.sub(r'^(?:open|visit|go to|check|browse|visit|load)\s+', '', text, flags=re.IGNORECASE)
    text = text.strip()
    
    # Already has protocol
    if text.startswith('http://') or text.startswith('https://'):
        return text
    
    # Common shortcuts
    shortcuts = {
        'youtube': 'https://www.youtube.com',
        'google': 'https://www.google.com',
        'github': 'https://github.com',
        'reddit': 'https://reddit.com',
        'twitter': 'https://twitter.com',
        'facebook': 'https://facebook.com',
        'instagram': 'https://instagram.com',
        'linkedin': 'https://linkedin.com',
        'amazon': 'https://amazon.com',
        'ebay': 'https://ebay.com',
        'wikipedia': 'https://en.wikipedia.org',
        'gmail': 'https://gmail.com',
        'discord': 'https://discord.com',
        'slack': 'https://slack.com',
    }
    
    # Check if it's just a shortcut
    for key, url in shortcuts.items():
        if text == key or text.startswith(key + ' '):
            query = text[len(key):].strip()
            
            # Special handling for youtube search
            if key == 'youtube' and query:
                return f"https://www.youtube.com/results?search_query={quote_plus(query)}"
            
            # For other services with search capability
            if query and key in ['google', 'reddit', 'wikipedia']:
                search_param = 'q' if key == 'google' else 's' if key == 'reddit' else 'search'
                return f"{url}?{search_param}={quote_plus(query)}"
            
            return url if not query else f"{url}/?q={quote_plus(query)}"
    
    # If no protocol and not a shortcut, assume https://
    if '.' in text:
        return f"https://{text}"
    
    return None


def _extract_app_name(text: str) -> Optional[str]:
    """Extract app name from 'open X', 'launch X', etc.
    
    Filters out multi-action commands like "open chrome and search" by checking
    for connectors like 'and', 'then', 'or', which indicate multiple intents.
    """
    # Remove action prefix
    text = re.sub(r'^(?:open|launch|run|start|kill|close)\s+', '', text, flags=re.IGNORECASE)
    text = text.strip() if text.strip() else None
    
    if not text:
        return None
    
    # Reject if it contains connectors (multi-action)
    if re.search(r'\b(?:and|then|or|&)\b', text, re.IGNORECASE):
        return None
    
    return text


def _extract_file_path(text: str) -> Optional[str]:
    """Extract file path from 'create file X', 'open X', etc."""
    # Remove action prefix
    text = re.sub(r'^(?:create|make|open|delete)\s+(?:file|folder|directory)\s+', '', text, flags=re.IGNORECASE)
    return text.strip() if text.strip() else None


# ── Fast-Path Patterns ────────────────────────────────────────────────────────

FAST_PATTERNS = [
    # Open website / URL
    {
        'pattern': r'^(?:open|visit|go to|check|browse)\s+(.+)$',
        'tool': 'open_website',
        'extract': lambda m: {'url': _extract_url(m.group(1))},
        'check': lambda args: args.get('url') is not None,
    },
    # Play YouTube video/song
    {
        'pattern': r'^(?:play|watch)\s+(.+?)\s*(?:on youtube|youtube)?$',
        'tool': 'play_youtube',
        'extract': lambda m: {'query': m.group(1).replace('on youtube', '').strip()},
        'check': lambda args: len(args.get('query', '').strip()) > 0,
    },
    # Search web
    {
        'pattern': r'^(?:search|google|find)\s+(?:for\s+)?(.+)$',
        'tool': 'web_search',
        'extract': lambda m: {'query': m.group(1)},
        'check': lambda args: len(args.get('query', '').strip()) > 0,
    },
    # Launch app
    {
        'pattern': r'^(?:open|launch|run|start)\s+(.+)$',
        'tool': 'launch_app',
        'extract': lambda m: {'app_name': _extract_app_name(m.group(1))},
        'check': lambda args: args.get('app_name') is not None,
        'avoid_if_match': r'(?:file|folder|website|youtube|url)',
    },
    # Create file / folder
    {
        'pattern': r'^(?:create|make)\s+(?:file|folder|directory)\s+(.+)$',
        'tool': 'create_folder',
        'extract': lambda m: {'folder_path': m.group(1).strip()},
        'check': lambda args: len(args.get('folder_path', '').strip()) > 0,
    },
    # Open file / folder
    {
        'pattern': r'^(?:open|show)\s+(?:file|folder)?\s*(.+)$',
        'tool': 'open_path',
        'extract': lambda m: {'path': m.group(1).strip()},
        'check': lambda args: len(args.get('path', '').strip()) > 0,
        'avoid_if_match': r'(?:youtube|google|website)',
    },
    # Lock / sleep / shutdown
    {
        'pattern': r'^(?:lock|sleep|shutdown|restart|restart pc)(?:\s+in\s+(\d+))?$',
        'tool': lambda m: {
            'lock': 'lock_pc',
            'sleep': 'sleep_pc',
            'shutdown': 'shutdown',
            'restart': 'restart',
        }.get(m.group(0).lower().split()[0], None),
        'extract': lambda m: {
            'delay_seconds': int(m.group(1)) if m.lastindex and m.group(1) else None,
        },
        'check': lambda args: True,
    },
    # Volume control
    {
        'pattern': r'^(?:set volume|volume)\s+(?:to\s+)?(\d+)(?:%)?$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': int(m.group(1))},
        'check': lambda args: 0 <= args.get('level', 0) <= 100,
    },
    {
        'pattern': r'^(?:mute|unmute)(?:\s+audio)?$',
        'tool': 'mute_audio',
        'extract': lambda m: {'muted': 'mute' in m.group(0).lower()},
        'check': lambda args: True,
    },
    # Media control
    {
        'pattern': r'^(?:play|pause|stop)(?:\s+music)?$',
        'tool': 'play_pause',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:next|skip)(?:\s+(?:track|song))?$',
        'tool': 'next_track',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:previous|prev)(?:\s+(?:track|song))?$',
        'tool': 'prev_track',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # System info
    {
        'pattern': r'^(?:system stats|cpu|memory|disk|stats)$',
        'tool': 'get_system_stats',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # Copy to clipboard
    {
        'pattern': r'^(?:copy|clip)\s+(.+)$',
        'tool': 'clipboard_copy',
        'extract': lambda m: {'text': m.group(1).strip()},
        'check': lambda args: len(args.get('text', '').strip()) > 0,
    },
    # Get volume
    {
        'pattern': r'^(?:get volume|volume\??|what\'s?|how much)$',
        'tool': 'get_volume',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
]


async def try_fastpath(message: str) -> Optional[tuple[str, dict]]:
    """Try to match and execute a fast-path pattern.
    
    Returns:
        (tool_name, args_dict) if matched, else None
    
    This is called BEFORE the LLM router. If it returns a tool,
    the agent should execute it directly without LLM inference.
    """
    normalized = _normalize(message)
    
    # Reject multi-action commands (contain "and", "or", "then", etc.)
    # These should go through the LLM for proper handling
    if re.search(r'\b(?:and|then|or|&|,)\b', normalized, re.IGNORECASE):
        logger.info("[FASTPATH] SKIP (multi-action): %r", message)
        return None
    
    # Strip casual speech prefixes to get the core command
    core_cmd = _strip_casual_prefix(normalized)
    
    if core_cmd != normalized:
        logger.info("[FASTPATH] Stripped casual prefix: %r → %r", normalized, core_cmd)
    
    for pattern_spec in FAST_PATTERNS:
        pattern = pattern_spec['pattern']
        match = re.match(pattern, core_cmd, re.IGNORECASE)
        
        if not match:
            continue
        
        # Check avoid_if_match (some patterns shouldn't trigger on certain keywords)
        if 'avoid_if_match' in pattern_spec:
            if re.search(pattern_spec['avoid_if_match'], core_cmd, re.IGNORECASE):
                logger.info("[FASTPATH] SKIP (avoid_if_match): pattern=%s message=%r", pattern, message)
                continue
        
        # Extract args
        try:
            args = pattern_spec['extract'](match)
        except Exception as e:
            logger.debug("[FASTPATH] Failed to extract args for %s: %e", pattern, e)
            continue
        
        # Validate
        if not pattern_spec['check'](args):
            logger.info("[FASTPATH] VALIDATION FAILED: pattern=%s args=%s", pattern, args)
            continue
        
        # Resolve tool name (can be a callable for dynamic selection)
        tool_name = pattern_spec['tool']
        if callable(tool_name):
            tool_name = tool_name(match)
            if not tool_name:
                continue
        
        logger.info(
            "[FASTPATH] ✓ MATCH → tool=%s | pattern=%r | args=%s",
            tool_name, pattern, args,
        )
        logger.info("[FASTPATH] Original message: %r", message)
        
        return (tool_name, args)
    
    logger.info("[FASTPATH] NO MATCH: %r (core: %r)", message, core_cmd)
    return None
