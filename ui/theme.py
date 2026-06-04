"""Global theme constants and state configuration for all UI components."""

from PySide6.QtGui import QColor

THEME = {
    "bg":          "rgba(5,8,14,228)",
    "panel_bg":    "rgba(8,12,20,215)",
    "input_bg":    "rgba(12,18,28,255)",
    "text":        "rgba(220,235,240,255)",
    "dim":         "rgba(120,160,150,140)",
    "scrollbar":   "rgba(0,255,180,40)",
    "aura_bubble": "rgba(0,255,180,10)",
    "aura_border": "rgba(0,255,180,55)",
    "user_bubble": "rgba(0,180,255,18)",
    "user_border": "rgba(0,180,255,65)",
    "font_mono":   "Courier New",
    "font_ui":     "Segoe UI",
}

STATE_CFG = {
    "idle":      {"label": "WAITING FOR WAKE WORD", "sub": "— system standby —",   "orb": QColor(0, 200, 140),  "accent": "#00c88c", "wave": False},
    "listening": {"label": "LISTENING",             "sub": "— speak now —",         "orb": QColor(0, 150, 255),  "accent": "#0096ff", "wave": True},
    "thinking":  {"label": "PROCESSING",            "sub": "— neural inference —",  "orb": QColor(180, 80, 255), "accent": "#b450ff", "wave": True},
    "speaking":  {"label": "SPEAKING",              "sub": "— audio output —",      "orb": QColor(232, 94, 40),  "accent": "#e85e28", "wave": True},
    "error":     {"label": "ERROR",                 "sub": "— check system —",      "orb": QColor(255, 60, 80),  "accent": "#ff3c50", "wave": False},
}