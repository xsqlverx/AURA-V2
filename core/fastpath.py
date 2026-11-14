"""Fast-path bypass for instant execution of simple operations.

Intercepts common patterns like "open X", "create file", "go to URL" and executes
them DIRECTLY without LLM inference. Reduces latency from 1-3s to <100ms.

This runs BEFORE the LLM router — if a pattern matches, it executes synchronously.
Complex requests fall through to the normal agent loop.
"""

import json
import logging
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

TIMER_RESPONSES = [
    "Timer set, enjoy {x} minutes of focus session master.",
    "Timer locked in for {x} minutes. Locked and loaded, let's get into the zone master.",
    "Got it, timer set for {x} minutes. Focus up, I'll keep watch master.",
    "Starting your {x}-minute timer now. Time to lock in master.",
    "Timer for {x} minutes is ticking. Let's make every second count master.",
    "All set! {x} minutes on the clock. Deep focus mode initiated master.",
    "Count it down—{x} minutes starting right now. I'll alert you the second time's up master.",
    "Got it master, your {x}-minute timer is running. Stay sharp.",
    ""
]

def get_timer_response(x: str | int | float) -> str:
    template = random.choice(TIMER_RESPONSES)
    return template.format(x=x)

_TIMER_REGEX = re.compile(
    r'(?:(?:aura|hey\s+aura|can\s+you|please|could\s+you)\s+)*(?:(?:set|start|put\s+on)(?:\s+a)?\s+)?timer(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)?|(?:(?:aura|hey\s+aura|can\s+you|please)\s+)*(?:(?:set|start)(?:\s+a)?\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s+timer',
    re.IGNORECASE
)

def match_timer_command(text: str) -> Optional[tuple[float, str]]:
    """Match timer intent from raw user text and return (value, unit) or None."""
    if not text:
        return None
    m = _TIMER_REGEX.search(text)
    if not m:
        return None
    val_str = m.group(1) or m.group(3)
    unit_str = m.group(2) or m.group(4) or "m"
    if not val_str:
        return None
    try:
        return float(val_str), unit_str.lower()
    except Exception:
        return None

# ── Pattern Matching ──────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    return re.sub(r'\s+', ' ', text.lower().strip().rstrip('?.!,;:'))


def _strip_casual_prefix(text: str) -> str:
    """Remove casual speech prefixes and conversational fillers to extract the core command.
    
    Handles:
    - "can you open youtube" → "open youtube"
    - "aura can you just open youtube" → "open youtube"
    - "or a close youtube" → "close youtube"
    - "ora open notepad" → "open notepad"
    - "hey aura please just launch spotify" → "launch spotify"
    - "can you please go ahead and open discord" → "open discord"
    """
    cleaned = text.strip()

    wake_pattern = re.compile(
        r'^(?:(?:hey|ok|yo)\s*[,:\-]?\s*)?(?:aura|ora|or\s+a|or\s+i|aurora|orang|or)\s*[,:\-]?\s*',
        re.IGNORECASE
    )
    filler_pattern = re.compile(
        r'^(?:can\s+you(?:\s+please)?|could\s+you(?:\s+please)?|would\s+you(?:\s+please)?|will\s+you|please|pls|just|now|kindly|go\s+ahead\s+and|i\s+want\s+you\s+to|do\s+me\s+a\s+favor\s+and)\s+',
        re.IGNORECASE
    )

    changed = True
    while changed:
        before = cleaned
        cleaned = wake_pattern.sub('', cleaned).strip()
        cleaned = filler_pattern.sub('', cleaned).strip()
        changed = (cleaned != before)

    return cleaned


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
    text = re.sub(r'^(?:open|launch|run|start|kill|close|exit|quit)\s+', '', text, flags=re.IGNORECASE)
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


def _extract_folder(text: str) -> str:
    """Extract destination folder from phrases like 'called foo at C:\\bar' or raw paths."""
    m = re.match(r'^(?:called\s+|named\s+)?(?:[\'"]([^\'"]+)[\'"]|(\S+))\s+(?:at|in)\s+(.+)$', text, re.IGNORECASE)
    if m:
        name = (m.group(1) or m.group(2)).strip()
        base = m.group(3).strip().strip('\'"')
        return str(Path(base) / name)
    cleaned = re.sub(r'^(?:called|named)\s+', '', text, flags=re.IGNORECASE).strip()
    return cleaned.strip('\'"')


# ── Fast-Path Patterns ────────────────────────────────────────────────────────

FAST_PATTERNS = [
    # Set Timer
    {
        'pattern': r'^(?:(?:set\s+(?:a\s+)?)?timer(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)?|(?:set\s+(?:a\s+)?)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\s+timer)$',
        'tool': 'set_timer',
        'extract': lambda m: {
            'value': float(m.group(1) or m.group(3)),
            'unit': (m.group(2) or m.group(4) or 'm').lower(),
        },
        'check': lambda args: args.get('value', 0) > 0,
    },
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
        'avoid_if_match': r'(?:memory|vault|note|notes)',
    },
    # Launch app
    {
        'pattern': r'^(?:open|launch|run|start)\s+(.+)$',
        'tool': 'launch_app',
        'extract': lambda m: {'app_name': _extract_app_name(m.group(1))},
        'check': lambda args: args.get('app_name') is not None,
        'avoid_if_match': r'(?:file|folder|website|youtube|url|process|processes)',
    },
    # Close app / tab
    {
        'pattern': r'^(?:close|exit|quit|kill)\s+(.+)$',
        'tool': 'close_app',
        'extract': lambda m: {'app_name': _extract_app_name(m.group(1))},
        'check': lambda args: args.get('app_name') is not None,
    },
    # Create file / folder
    {
        'pattern': r'^(?:create|make)\s+(?:a\s+)?(?:file|folder|directory)\s+(.+)$',
        'tool': 'create_folder',
        'extract': lambda m: {'folder_path': _extract_folder(m.group(1))},
        'check': lambda args: len(args.get('folder_path', '').strip()) > 0,
    },
    # List directory files
    {
        'pattern': r'^(?:list|show)(?:\s+(?:all\s+)?files|\s+files)?(?:\s+(?:in|of|at))?\s+(.+)$',
        'tool': 'list_directory',
        'extract': lambda m: {'dir_path': m.group(1).strip().strip('\'"')},
        'check': lambda args: len(args.get('dir_path', '').strip()) > 0,
        'avoid_if_match': r'(?:process|processes|task|tasks|stats|note|notes|cpu|ram)',
    },
    # List processes (all or filtered)
    {
        'pattern': r'^(?:(?:what|which|list|show)(?:\s+me)?(?:\s+all)?\s+)?(?:running\s+)?processes(?:\s+are\s+running)?(?:\s+on\s+my\s+pc)?(?:\?)?$',
        'tool': 'list_running_processes',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:(?:list|show|what)(?:\s+me)?(?:\s+all)?\s+)?(\w+)\s+processes(?:\s+running)?(?:\?)?$',
        'tool': 'list_running_processes',
        'extract': lambda m: {'filter_name': m.group(1)},
        'check': lambda args: True,
        'avoid_if_match': r'(?:running|all|what|which|list|show)',
    },
    # Open file / folder
    {
        'pattern': r'^(?:open|show)\s+(?:file|folder)?\s*(.+)$',
        'tool': 'open_path',
        'extract': lambda m: {'path': m.group(1).strip()},
        'check': lambda args: len(args.get('path', '').strip()) > 0,
        'avoid_if_match': r'(?:youtube|google|website|process|processes|task|tasks|stats|note|notes|cpu|ram)',
    },
    # Lock / sleep / shutdown / cancel
    {
        'pattern': r'^(?:cancel|abort|stop)(?:\s+(?:the|a|any|scheduled|pending|\s+)*)?\s*shutdown(?:\s+now)?$',
        'tool': 'cancel_shutdown',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:lock|sleep|shutdown|restart)(?:\s+(?:the|my|this)?\s*(?:pc|screen|computer))?(?:\s+in\s+(\d+)(?:\s*s(?:econds?)?)?)?$',
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
    # Volume control (supports numbers, %, and words like 'banana' for validation error)
    {
        'pattern': r'^(?:set|turn|change|adjust)?(?:\s*(?:the|my))?\s*volume\s+(?:to\s+)?([a-zA-Z0-9%]+)$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': int(m.group(1).rstrip('%')) if m.group(1).rstrip('%').isdigit() else m.group(1)},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:get|check|show|what(?:\'s| is))(?:\s+(?:the|my))?\s+volume(?:\s+at)?(?:\?)?$',
        'tool': 'get_volume',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:how loud is (?:it|the audio|my pc))(?:\?)?$',
        'tool': 'get_volume',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:mute|unmute)(?:\s+(?:my|the))?(?:\s+(?:audio|sound|speakers|pc))?$',
        'tool': 'mute_audio',
        'extract': lambda m: {'muted': 'mute' in m.group(0).lower() and not m.group(0).lower().startswith('unmute')},
        'check': lambda args: True,
    },
    # Media control
    {
        'pattern': r'^(?:play|pause|stop|resume)(?:\s+(?:my|the))?(?:\s+(?:music|song|track|media))?$',
        'tool': 'play_pause',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:next|skip)(?:\s+(?:the\s+)?)?(?:track|song|music)?$',
        'tool': 'next_track',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:previous|prev|go back|back)(?:\s+(?:to\s+(?:the\s+)?)?(?:last|previous)?\s*(?:track|song|music))?$',
        'tool': 'prev_track',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # System info
    {
        'pattern': r'^(?:what are my )?(?:system stats|pc stats|cpu|memory|disk|stats)(?:\?)?$',
        'tool': 'get_system_stats',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # Clipboard
    {
        'pattern': r'^(?:what(?:\'s| is)\s+(?:currently\s+)?(?:on|in)\s+(?:my|the)\s+clipboard|show clipboard|paste|read clipboard|get clipboard)(?:\?)?$',
        'tool': 'clipboard_paste',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:copy|clip)\s+(?:the text\s+)?[\'"]?(.+?)[\'"]?\s+(?:to\s+(?:my\s+)?clipboard)$',
        'tool': 'clipboard_copy',
        'extract': lambda m: {'text': m.group(1).strip()},
        'check': lambda args: len(args.get('text', '').strip()) > 0,
    },
    {
        'pattern': r'^(?:copy|clip)\s+(.+)$',
        'tool': 'clipboard_copy',
        'extract': lambda m: {'text': m.group(1).strip()},
        'check': lambda args: len(args.get('text', '').strip()) > 0,
    },
    # Common folder shortcuts
    {
        'pattern': r'^(?:open|show)(?:\s+(?:my))?\s+downloads$',
        'tool': 'open_path',
        'extract': lambda m: {'path': str(Path.home() / 'Downloads')},
        'check': lambda args: True,
    },
    {
        'pattern': r'^(?:open|show)(?:\s+(?:my))?\s+desktop$',
        'tool': 'open_path',
        'extract': lambda m: {'path': str(Path.home() / 'Desktop')},
        'check': lambda args: True,
    },
    # Tasks & Calendar
    {
        'pattern': r'^(?:add|create)(?:\s+a)?\s+task(?:\s+called)?\s+[\'"]?([^\'"]+)[\'"]?\s+(?:to\s+(?:my\s+)?calendar)$',
        'tool': 'create_task',
        'extract': lambda m: {'name': m.group(1).strip(), 'date': datetime.now().strftime("%Y-%m-%d")},
        'check': lambda args: len(args.get('name', '').strip()) > 0,
    },
    {
        'pattern': r'^(?:what\s+tasks\s+are\s+on\s+(?:my|the)\s+calendar|list(?: my)? tasks|show(?: my)? (?:tasks|calendar|reminders))(?:\?)?$',
        'tool': 'list_tasks',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # Volume — natural speech: "louder", "quieter", "turn it up/down", "increase/decrease volume"
    {
        'pattern': r'^(?:(?:turn|make)(?:\s+(?:it|the\s+(?:audio|sound|volume)))?)\s+(?:up|louder|higher)$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': '_up'},  # handled by set_volume tool as relative
        'check': lambda args: True,
        'relative': 'up',
    },
    {
        'pattern': r'^(?:(?:turn|make)(?:\s+(?:it|the\s+(?:audio|sound|volume)))?)\s+(?:down|quieter|lower|softer)$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': '_down'},
        'check': lambda args: True,
        'relative': 'down',
    },
    {
        'pattern': r'^(?:louder|volume up|turn up|raise(?: the)? volume)$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': '_up'},
        'check': lambda args: True,
        'relative': 'up',
    },
    {
        'pattern': r'^(?:quieter|volume down|turn down|lower(?: the)? volume|softer)$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': '_down'},
        'check': lambda args: True,
        'relative': 'down',
    },
    {
        'pattern': r'^(?:increase|raise|bump up)(?:\s+(?:the|my))?(?:\s+(?:volume|sound))?(?:\s+by\s+(\d+)(?:\s*%)?)?$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': f'+{m.group(1) or "10"}'},
        'check': lambda args: True,
        'relative': 'up',
    },
    {
        'pattern': r'^(?:decrease|reduce|drop|lower)(?:\s+(?:the|my))?(?:\s+(?:volume|sound))?(?:\s+by\s+(\d+)(?:\s*%)?)?$',
        'tool': 'set_volume',
        'extract': lambda m: {'level': f'-{m.group(1) or "10"}'},
        'check': lambda args: True,
        'relative': 'down',
    },
    # System stats — extra phrasings
    {
        'pattern': r'^(?:how(?:\'s| is) (?:the )?(?:pc|computer|system|cpu|ram)(?:\s+doing)?|check (?:my\s+)?(?:system|pc|cpu|ram|stats)|system (?:usage|info|status|health))(?:\?)?$',
        'tool': 'get_system_stats',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # Clipboard — more natural phrasings
    {
        'pattern': r'^(?:what(?:\'s| is|\'s) in (?:my\s+)?clipboard|clipboard contents?|read (?:my\s+)?clipboard|show (?:me\s+)?(?:my\s+)?clipboard)(?:\?)?$',
        'tool': 'clipboard_paste',
        'extract': lambda m: {},
        'check': lambda args: True,
    },
    # What's playing
    {
        'pattern': r'^(?:what(?:\'s| is) (?:currently\s+)?playing|what song is this|what(?:\'s| is) this song)(?:\?)?$',
        'tool': 'get_system_stats',  # closest available — routes to cloud if needed
        'extract': lambda m: {},
        'check': lambda args: False,  # intentionally fail → fall through to cloud
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

    # Strip casual speech prefixes to get the core command first
    core_cmd = _strip_casual_prefix(normalized)

    if core_cmd != normalized:
        logger.info("[FASTPATH] Stripped casual prefix: %r → %r", normalized, core_cmd)

    # Reject multi-action compound commands on the core command (e.g. "open chrome and then open youtube")
    # Requires non-whitespace word characters on both sides of connector
    if re.search(r'\b\w+\s+(?:and\s+then|and|then|after\s+that)\s+\w+\b', core_cmd, re.IGNORECASE):
        logger.info("[FASTPATH] SKIP (multi-action): %r", message)
        return None
    
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
        
        # For clipboard copy and create_task, preserve original casing and quotes from message
        if tool_name == "clipboard_copy":
            q = re.search(r'[\'"]([^\'"]+)[\'"]', message)
            if q:
                args['text'] = q.group(1).strip()
            else:
                m_orig = re.search(r'\b(?:copy|clip)\s+(?:the text\s+)?(.+?)(?:\s+to\s+(?:my\s+)?clipboard)?$', message, re.IGNORECASE)
                if m_orig:
                    args['text'] = m_orig.group(1).strip()
        elif tool_name == "create_task":
            q = re.search(r'[\'"]([^\'"]+)[\'"]', message)
            if q:
                args['name'] = q.group(1).strip()
            else:
                m_orig = re.search(r'\b(?:add|create)(?:\s+a)?\s+task(?:\s+called)?\s+(.+?)(?:\s+to\s+(?:my\s+)?calendar)?$', message, re.IGNORECASE)
                if m_orig:
                    args['name'] = m_orig.group(1).strip()
        elif tool_name == "set_volume" and isinstance(args.get('level'), str) and args['level'].startswith(('_up', '_down', '+', '-')):
            # Relative volume: resolve to absolute by reading current level + stepping ±10
            try:
                from tools import system as _sys
                cur = _sys.get_volume().get('volume', 50)
                step = 10
                level_str = args['level']
                if level_str == '_up':
                    args['level'] = min(100, cur + step)
                elif level_str == '_down':
                    args['level'] = max(0, cur - step)
                elif level_str.startswith('+'):
                    args['level'] = min(100, cur + int(level_str[1:]))
                elif level_str.startswith('-'):
                    args['level'] = max(0, cur - int(level_str[1:]))
            except Exception:
                # Can't resolve current volume — fall through to cloud
                logger.debug("[FASTPATH] Relative volume resolution failed, falling through")
                continue

        logger.info(
            "[FASTPATH] ✓ MATCH → tool=%s | pattern=%r | args=%s",
            tool_name, pattern, args,
        )
        logger.info("[FASTPATH] Original message: %r", message)
        
        return (tool_name, args)
    
    logger.info("[FASTPATH] NO MATCH: %r (core: %r)", message, core_cmd)
    return None
