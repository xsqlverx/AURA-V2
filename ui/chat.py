"""Sci-fi HUD chat panel (Jarvis-style) with bubbles, streaming, export, and log controls."""

from __future__ import annotations

import re
from datetime import datetime

from PySide6.QtCore import (
    QEasingCurve,
    QPoint,
    QPropertyAnimation,
    QTimer,
    Qt,
    Signal,
)
from PySide6.QtGui import QAction, QClipboard, QGuiApplication
from PySide6.QtWidgets import (
    QFileDialog,
    QFrame,
    QGraphicsOpacityEffect,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMenu,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ui.theme import STATE_CFG, THEME


def _markdown_to_html(raw: str, *, link_color: str) -> str:
    """Convert a small markdown subset (bold, italic, code, URLs) to QLabel HTML."""
    t = raw.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def _code(m: re.Match[str]) -> str:
        inner = m.group(1)
        return (
            f"<code style='font-family:{THEME['font_mono']}; "
            f"color:{THEME['text']}; background:{THEME['input_bg']}; "
            f"padding:2px 5px; border-radius:3px;'>{inner}</code>"
        )

    t = re.sub(r"`([^`]+)`", _code, t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", t)
    t = re.sub(r"(?<![\w`])_(.+?)_(?![\w`])", r"<i>\1</i>", t)

    def _link(m: re.Match[str]) -> str:
        url = m.group(1)
        safe = url.replace('"', "&quot;")
        return f'<a href="{safe}" style="color:{link_color}; text-decoration:none;">{url}</a>'

    t = re.sub(r"(https?://[^\s<]+)", _link, t)
    return t.replace("\n", "<br>")


class MessageBubble(QFrame):
    """Single HUD message with streaming text, fade-in, copy, timestamp, and markdown."""

    delete_requested = Signal(object)

    def __init__(self, text: str, sender: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._raw_text = text
        self._sender = self._normalize_sender(sender)
        self._is_user = self._sender == "user"

        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._show_context_menu)

        self.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Minimum)
        self.setMaximumWidth(520)

        link_color = THEME["user_border"] if self._is_user else THEME["aura_border"]
        self._link_color = link_color

        border = THEME["user_border"] if self._is_user else THEME["aura_border"]
        bg = THEME["user_bubble"] if self._is_user else THEME["aura_bubble"]
        self.setStyleSheet(
            f"MessageBubble {{ background: {bg}; border: 1px solid {border}; "
            f"border-radius: 10px; }}"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 10)
        layout.setSpacing(4)

        top = QHBoxLayout()
        top.setSpacing(8)

        self._time_lbl = QLabel(datetime.now().strftime("%H:%M:%S"))
        self._time_lbl.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 10px;"
        )

        top.addWidget(self._time_lbl)
        top.addStretch(1)

        self._copy_btn: QPushButton | None = None
        if not self._is_user:
            self._copy_btn = QPushButton("COPY")
            self._copy_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            self._copy_btn.setStyleSheet(
                f"QPushButton {{ color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; "
                f"font-size: 10px; border: 1px solid {THEME['aura_border']}; border-radius: 4px; "
                f"padding: 2px 8px; background: transparent; }}"
                f"QPushButton:hover {{ background: {THEME['aura_bubble']}; }}"
            )
            self._copy_btn.clicked.connect(self._copy_plain)
            top.addWidget(self._copy_btn, 0, Qt.AlignmentFlag.AlignRight)

        layout.addLayout(top)

        self._body = QLabel()
        self._body.setWordWrap(True)
        self._body.setTextFormat(Qt.TextFormat.RichText)
        self._body.setOpenExternalLinks(True)
        self._body.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
            | Qt.TextInteractionFlag.LinksAccessibleByMouse
        )
        self._body.setStyleSheet(
            f"color: {THEME['text']}; font-family: {THEME['font_mono']}; font-size: 12px; "
            f"background: transparent; border: none;"
        )
        layout.addWidget(self._body)

        self._apply_text()

        effect = QGraphicsOpacityEffect(self)
        effect.setOpacity(0.0)
        self.setGraphicsEffect(effect)
        self._fade_anim = QPropertyAnimation(effect, b"opacity", self)
        self._fade_anim.setDuration(420)
        self._fade_anim.setStartValue(0.0)
        self._fade_anim.setEndValue(1.0)
        self._fade_anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        self._fade_anim.finished.connect(self._clear_fade_effect)
        self._fade_anim.start()

    @staticmethod
    def _normalize_sender(sender: str) -> str:
        s = (sender or "").strip().lower()
        if s in ("user", "human"):
            return "user"
        return "aura"

    def _apply_text(self) -> None:
        html = _markdown_to_html(self._raw_text, link_color=self._link_color)
        self._body.setText(html)

    def append_text(self, chunk: str) -> None:
        """Append streamed characters and refresh markdown rendering."""
        self._raw_text += chunk
        self._apply_text()

    def plain_text(self) -> str:
        return self._raw_text

    def sender_role(self) -> str:
        return "user" if self._is_user else "aura"

    def timestamp_text(self) -> str:
        return self._time_lbl.text()

    def _clear_fade_effect(self) -> None:
        self.setGraphicsEffect(None)

    def _copy_plain(self) -> None:
        QGuiApplication.clipboard().setText(self._raw_text, QClipboard.Mode.Clipboard)

    def _show_context_menu(self, pos: QPoint) -> None:
        menu = QMenu(self)
        copy_act = QAction("Copy", self)
        copy_act.triggered.connect(self._copy_plain)
        del_act = QAction("Delete", self)
        del_act.triggered.connect(lambda: self.delete_requested.emit(self))
        menu.addAction(copy_act)
        menu.addAction(del_act)
        menu.exec(self.mapToGlobal(pos))


class _TypingIndicator(QWidget):
    """Minimal pulsing HUD row shown while the model is thinking."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        thinking = STATE_CFG["thinking"]
        lay = QHBoxLayout(self)
        lay.setContentsMargins(12, 6, 12, 6)
        self._base = thinking["label"]
        self._label = QLabel(f"{self._base} · · ·")
        self._label.setStyleSheet(
            f"color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; font-size: 11px; "
            f"letter-spacing: 2px;"
        )
        lay.addWidget(self._label, 0, Qt.AlignmentFlag.AlignLeft)
        lay.addStretch(1)
        self._dots = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)

    def _tick(self) -> None:
        self._dots = (self._dots + 1) % 4
        dots = "." * self._dots
        self._label.setText(f"{self._base} {dots}")

    def restart(self) -> None:
        self._dots = 0
        self._label.setText(f"{self._base} ")
        if not self._timer.isActive():
            self._timer.start(420)

    def stop(self) -> None:
        self._timer.stop()


class ChatPanel(QWidget):
    """
    Scrollable HUD conversation log with export/clear, streaming API, and voice hook-ins.
    """

    message_sent = Signal(str)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._api_history: list[dict] = []
        self._bubbles: list[MessageBubble] = []
        self._stream_bubble: MessageBubble | None = None
        self._stream_buffer = ""
        self._streaming = False

        self.setStyleSheet(
            f"ChatPanel {{ background: {THEME['panel_bg']}; border: none; }}"
        )

        root = QVBoxLayout(self)
        root.setContentsMargins(10, 10, 10, 10)
        root.setSpacing(8)

        header = QHBoxLayout()
        title = QLabel("CONVERSATION LOG")
        title.setStyleSheet(
            f"color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; "
            f"font-size: 11px; letter-spacing: 3px;"
        )
        header.addWidget(title, 0, Qt.AlignmentFlag.AlignLeft)
        header.addStretch(1)

        self._btn_export = QPushButton("EXPORT")
        self._btn_clear = QPushButton("CLEAR")
        for btn in (self._btn_export, self._btn_clear):
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setStyleSheet(
                f"QPushButton {{ color: {THEME['text']}; font-family: {THEME['font_mono']}; "
                f"font-size: 10px; border: 1px solid {THEME['user_border']}; border-radius: 4px; "
                f"padding: 4px 12px; background: {THEME['user_bubble']}; }}"
                f"QPushButton:hover {{ border-color: {THEME['aura_border']}; color: {THEME['aura_border']}; }}"
            )
        self._btn_export.clicked.connect(self._export_log)
        self._btn_clear.clicked.connect(self._clear_log)
        header.addWidget(self._btn_export, 0, Qt.AlignmentFlag.AlignRight)
        header.addWidget(self._btn_clear, 0, Qt.AlignmentFlag.AlignRight)
        root.addLayout(header)

        self._scroll = QScrollArea()
        self._scroll.setWidgetResizable(True)
        self._scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self._scroll.setVerticalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAsNeeded
        )
        self._scroll.setFrameShape(QFrame.Shape.NoFrame)
        self._scroll.setStyleSheet(
            f"QScrollArea {{ border: none; background: {THEME['bg']}; }}"
            f"QScrollBar:vertical {{ width: 8px; background: {THEME['panel_bg']}; margin: 0; }}"
            f"QScrollBar::handle:vertical {{ background: {THEME['scrollbar']}; "
            f"min-height: 28px; border-radius: 3px; }}"
            f"QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}"
        )

        self._list_host = QWidget()
        self._list_layout = QVBoxLayout(self._list_host)
        self._list_layout.setContentsMargins(6, 6, 6, 6)
        self._list_layout.setSpacing(10)
        self._list_layout.addStretch(1)

        self._scroll.setWidget(self._list_host)
        root.addWidget(self._scroll, stretch=1)

        self._typing = _TypingIndicator()
        self._typing.hide()
        root.addWidget(self._typing)

        input_row = QHBoxLayout()
        self._input = QLineEdit()
        self._input.setPlaceholderText("Transmit to Aura…")
        self._input.returnPressed.connect(self._submit_input)
        self._input.setStyleSheet(
            f"QLineEdit {{ background: {THEME['input_bg']}; color: {THEME['text']}; "
            f"font-family: {THEME['font_mono']}; font-size: 12px; border: 1px solid {THEME['user_border']}; "
            f"border-radius: 6px; padding: 8px 12px; }}"
            f"QLineEdit:focus {{ border-color: {THEME['aura_border']}; }}"
        )
        input_row.addWidget(self._input, stretch=1)
        root.addLayout(input_row)

    # --- Public API ---------------------------------------------------------

    def push_message(self, text: str, sender: str) -> None:
        """Append a completed user or aura message bubble."""
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        bubble = MessageBubble(text, sender)
        bubble.delete_requested.connect(self._on_bubble_delete)

        if MessageBubble._normalize_sender(sender) == "user":
            row.addStretch(1)
            row.addWidget(bubble, 0, Qt.AlignmentFlag.AlignRight)
        else:
            row.addWidget(bubble, 0, Qt.AlignmentFlag.AlignLeft)
            row.addStretch(1)

        host = QWidget()
        host.setLayout(row)
        insert_at = max(0, self._list_layout.count() - 1)
        self._list_layout.insertWidget(insert_at, host)
        self._bubbles.append(bubble)
        self._scroll_to_bottom()

    def start_stream(self) -> None:
        """Show typing indicator and prepare for streamed aura tokens."""
        self._streaming = True
        self._stream_buffer = ""
        self._stream_bubble = None
        self._typing.restart()
        self._typing.show()
        self._set_input_enabled(False)

    def append_stream(self, chunk: str) -> None:
        """Append a chunk to the in-flight aura response."""
        if not self._streaming:
            return
        self._stream_buffer += chunk
        if self._stream_bubble is None:
            if chunk.strip() == "" and self._stream_buffer.strip() == "":
                return
            self._typing.hide()
            self._stream_bubble = self._append_stream_shell()
        self._stream_bubble.append_text(chunk)
        self._scroll_to_bottom()

    def end_stream(self) -> None:
        """Hide typing state and finalize the streamed message for history."""
        self._typing.stop()
        self._typing.hide()
        if self._streaming and self._stream_bubble is None and not self._stream_buffer.strip():
            self.push_message("[No response]", "aura")
        elif self._stream_bubble is not None:
            self._api_history.append(
                {"role": "assistant", "content": self._stream_bubble.plain_text()}
            )
        self._stream_bubble = None
        self._stream_buffer = ""
        self._streaming = False
        self._set_input_enabled(True)
        self._scroll_to_bottom()

    def is_streaming(self) -> bool:
        return self._streaming

    def append_api_history(self, turn: dict) -> None:
        """Append one chat API turn (e.g. user message) for the next backend request."""
        self._api_history.append(turn)

    def history_for_backend(self) -> list[dict]:
        """Conversation prior to the last user turn (must already be in _api_history)."""
        return list(self._api_history[:-1])

    def commit_user_bubble(self, text: str) -> bool:
        """Push a user bubble, record API history, and emit message_sent; returns False if busy."""
        text = text.strip()
        if not text or self._streaming:
            return False
        self.push_message(text, "user")
        self._api_history.append({"role": "user", "content": text})
        self.message_sent.emit(text)
        return True

    def focus_chat_input(self) -> None:
        self._input.setFocus(Qt.FocusReason.ShortcutFocusReason)

    # --- Internals ----------------------------------------------------------

    def _append_stream_shell(self) -> MessageBubble:
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        bubble = MessageBubble("", "aura")
        bubble.delete_requested.connect(self._on_bubble_delete)
        row.addWidget(bubble, 0, Qt.AlignmentFlag.AlignLeft)
        row.addStretch(1)
        host = QWidget()
        host.setLayout(row)
        insert_at = max(0, self._list_layout.count() - 1)
        self._list_layout.insertWidget(insert_at, host)
        self._bubbles.append(bubble)
        return bubble

    def get_last_assistant_message(self) -> str | None:
        """Return the plain text of the most recent assistant message."""
        if not self._bubbles:
            return None
        # Search backwards for the last 'aura' bubble
        for b in reversed(self._bubbles):
            if b.sender_role() == "aura":
                return b.plain_text()
        return None

    def _submit_input(self) -> None:
        raw = self._input.text()
        if self.commit_user_bubble(raw):
            self._input.clear()

    def _set_input_enabled(self, enabled: bool) -> None:
        self._input.setEnabled(enabled)
        self._btn_export.setEnabled(enabled)
        self._btn_clear.setEnabled(enabled)
        if enabled:
            self._input.setFocus(Qt.FocusReason.OtherFocusReason)

    def _scroll_to_bottom(self) -> None:
        bar = self._scroll.verticalScrollBar()
        bar.setValue(bar.maximum())

    def _on_bubble_delete(self, bubble: object) -> None:
        if not isinstance(bubble, MessageBubble):
            return
        if bubble in self._bubbles:
            self._bubbles.remove(bubble)
        bubble.parent().deleteLater()

    def _clear_log(self) -> None:
        self._api_history.clear()
        self._bubbles.clear()
        while self._list_layout.count() > 1:
            item = self._list_layout.takeAt(0)
            w = item.widget()
            if w is not None:
                w.deleteLater()

    def _export_log(self) -> None:
        lines: list[str] = []
        for b in self._bubbles:
            role = "USER" if b.sender_role() == "user" else "AURA"
            lines.append(f"[{b.timestamp_text()}] {role}: {b.plain_text()}")
        body = "\n".join(lines) if lines else "(empty log)"
        path, _ = QFileDialog.getSaveFileName(
            self,
            "Export conversation",
            "",
            "Text files (*.txt);;All files (*.*)",
        )
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
        except OSError as e:
            QMessageBox.warning(self, "Export failed", str(e))

