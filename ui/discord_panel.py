"""Discord panel — shows in the DISCORD tab of the Aura HUD."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from comms import state as comms_state
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ui.theme import THEME


class DiscordPanel(QWidget):
    """
    Discord tab content.
    Shows an input for the friend's Discord user ID, an Activate button,
    and a scrolling message log of the bot↔friend conversation.
    """

    activate_requested = Signal(str)   # emits user_id when Activate clicked

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._build()

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(8, 8, 8, 8)
        root.setSpacing(8)

        # ── Status label ──────────────────────────────────────────────────────
        self._status = QLabel("◈  NO ACTIVE SESSION")
        self._status.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 10px;"
        )
        root.addWidget(self._status)

        # ── Activate row ──────────────────────────────────────────────────────
        row = QHBoxLayout()
        self._input = QLineEdit()
        self._input.setPlaceholderText("Friend's Discord user ID…")
        self._input.setStyleSheet(
            f"QLineEdit {{ background: rgba(6,10,18,200); color: {THEME['text']}; "
            f"border: 1px solid rgba(0,255,180,40); border-radius: 6px; "
            f"padding: 4px 8px; font-family: {THEME['font_mono']}; font-size: 11px; }}"
            f"QLineEdit:focus {{ border-color: {THEME['aura_border']}; }}"
        )
        self._input.returnPressed.connect(self._on_activate)
        row.addWidget(self._input)

        self._btn = QPushButton("ACTIVATE")
        self._btn.setFixedWidth(90)
        self._btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._btn.setStyleSheet(
            f"QPushButton {{ color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; "
            f"font-size: 10px; letter-spacing: 1px; border: 1px solid {THEME['aura_border']}; "
            f"border-radius: 6px; padding: 4px 8px; background: transparent; }}"
            f"QPushButton:hover {{ background: {THEME['aura_bubble']}; }}"
            f"QPushButton:disabled {{ color: {THEME['dim']}; border-color: {THEME['dim']}; }}"
        )
        self._btn.clicked.connect(self._on_activate)
        row.addWidget(self._btn)

        self._deactivate_btn = QPushButton("DEACTIVATE")
        self._deactivate_btn.setVisible(False)
        self._deactivate_btn.setFixedWidth(110)
        self._deactivate_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._deactivate_btn.setStyleSheet(
            f"QPushButton {{ color: rgba(255,80,80,200); font-family: {THEME['font_mono']}; "
            f"font-size: 10px; letter-spacing: 1px; border: 1px solid rgba(255,80,80,150); "
            f"border-radius: 6px; padding: 4px 8px; background: transparent; }}"
            f"QPushButton:hover {{ background: rgba(255,80,80,15); }}"
        )
        self._deactivate_btn.clicked.connect(self.reset)
        row.addWidget(self._deactivate_btn)
        root.addLayout(row)

        # ── Message log ───────────────────────────────────────────────────────
        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(True)
        self._scroll.setStyleSheet(
            "QScrollArea { border: none; background: transparent; }"
            "QScrollBar:vertical { width: 4px; background: transparent; }"
            "QScrollBar::handle:vertical { background: rgba(0,255,180,60); border-radius: 2px; }"
        )
        self._msg_container = QWidget()
        self._msg_container.setStyleSheet("background: transparent;")
        self._msg_layout = QVBoxLayout(self._msg_container)
        self._msg_layout.setContentsMargins(0, 0, 0, 0)
        self._msg_layout.setSpacing(6)
        self._msg_layout.addStretch(1)
        self._scroll.setWidget(self._msg_container)
        root.addWidget(self._scroll, stretch=1)

    def _on_activate(self) -> None:
        raw = self._input.text().strip()
        if not raw.isdigit():
            self._status.setText("◈  ENTER A VALID NUMERIC USER ID")
            self._status.setStyleSheet(
                "color: rgba(255,80,80,200); font-family: monospace; font-size: 10px;"
            )
            return
        self._btn.setEnabled(False)
        self._btn.setText("ACTIVE")
        self._input.setEnabled(False)
        self._status.setText(f"◈  SESSION ACTIVE — ID {raw}")
        self._status.setStyleSheet(
            f"color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; font-size: 10px;"
        )
        self._deactivate_btn.setVisible(True)
        self.activate_requested.emit(raw)

    def push_message(self, sender: str, text: str) -> None:
        """Add a message bubble to the log."""
        is_aura = sender.lower() == "aura"

        bubble = QLabel(f"<b>{sender}:</b> {text}")
        bubble.setWordWrap(True)
        bubble.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        color = THEME["aura_border"] if is_aura else THEME["text"]
        bg    = "rgba(0,255,180,10)" if is_aura else "rgba(255,255,255,5)"
        bubble.setStyleSheet(
            f"color: {color}; background: {bg}; border-radius: 6px; "
            f"padding: 6px 10px; font-family: {THEME['font_mono']}; font-size: 11px;"
        )

        # Insert before the trailing stretch
        count = self._msg_layout.count()
        self._msg_layout.insertWidget(count - 1, bubble)

        # Scroll to bottom
        self._scroll.verticalScrollBar().setValue(
            self._scroll.verticalScrollBar().maximum()
        )

    def reset(self) -> None:
        """Clear session and message log."""
        self._btn.setEnabled(True)
        self._btn.setText("ACTIVATE")
        self._input.setEnabled(True)
        self._input.clear()
        self._status.setText("◈  NO ACTIVE SESSION")
        self._status.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 10px;"
        )
        self._deactivate_btn.setVisible(False)
        comms_state.clear_session()
        # Clear messages (keep trailing stretch)
        while self._msg_layout.count() > 1:
            item = self._msg_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()