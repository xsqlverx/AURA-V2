"""PySide6 main HUD window — frameless Jarvis-style overlay, tray, workers, and chat."""

from __future__ import annotations

import logging
import sys

from collections.abc import Callable

from PySide6.QtCore import (
    QEasingCurve,
    QEvent,
    QObject,
    QPoint,
    QRect,
    Qt,
    QTimer,
    QVariantAnimation,
)
from PySide6.QtGui import (
    QAction,
    QCloseEvent,
    QColor,
    QFont,
    QGuiApplication,
    QIcon,
    QKeySequence,
    QMouseEvent,
    QPainter,
    QPixmap,
    QResizeEvent,
    QShortcut,
    QShowEvent,
)
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QGraphicsDropShadowEffect,
    QHBoxLayout,
    QLabel,
    QMenu,
    QPushButton,
    QStackedWidget,
    QSystemTrayIcon,
    QVBoxLayout,
    QWidget,
)

from ui.chat import ChatPanel
from ui.discord_panel import DiscordPanel
from ui.theme import STATE_CFG, THEME
from ui.widgets import (
    CornerBrackets,
    ParticleBackground,
    PulseOrb,
    ScanLine,
    WaveBar,
)
from ui.workers import BackendStream, HealthCheck, UISocketServer

logger = logging.getLogger(__name__)

_COLLAPSED  = 54
_EXPANDED_W = 680
_EXPANDED_H = 640
_HUD_H      = 82
_TAB_H      = 36


class _HudDragFrame(QFrame):
    def __init__(self, shell: "AuraUI", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._shell = shell
        self._drag_anchor: QPoint | None = None

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_anchor = (
                event.globalPosition().toPoint() - self._shell.frameGeometry().topLeft()
            )
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        if self._drag_anchor is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self._shell.move(event.globalPosition().toPoint() - self._drag_anchor)
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        self._drag_anchor = None
        super().mouseReleaseEvent(event)


class _IconDragWidget(QWidget):
    def __init__(self, shell: "AuraUI", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._shell = shell
        self._drag_anchor: QPoint | None = None

    def enterEvent(self, event: QEvent) -> None:
        self._shell._on_icon_hover()
        super().enterEvent(event)

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_anchor = (
                event.globalPosition().toPoint() - self._shell.frameGeometry().topLeft()
            )
            self._shell._on_icon_click()
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        if self._drag_anchor is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self._shell.move(event.globalPosition().toPoint() - self._drag_anchor)
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        self._drag_anchor = None
        super().mouseReleaseEvent(event)


class AuraUI(QWidget):
    """Frameless translucent HUD shell with expand/collapse, workers, and chat."""

    def __init__(self, tts: any = None) -> None:
        super().__init__(
            None,
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool,
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_Hover, True)
        self.setMouseTracking(True)

        self._expanded   = False
        self._state_key  = "idle"
        self._stream_worker: BackendStream | None = None
        self._geom_anim: QVariantAnimation | None = None
        self._tts = tts

        self._particles = ParticleBackground(self)
        self._scan      = ScanLine(self)
        self._front     = QWidget(self)
        self._front.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._front.setStyleSheet("background: transparent;")

        self._stack = QStackedWidget(self._front)
        self._build_icon_page()
        self._build_expanded_page()

        fl = QVBoxLayout(self._front)
        fl.setContentsMargins(0, 0, 0, 0)
        fl.addWidget(self._stack)

        self._chat.setVisible(False)
        self._chat.message_sent.connect(self._start_backend_stream)

        self._health = HealthCheck(self)
        self._health.status_changed.connect(self._on_health_changed)

        self._socket_server = UISocketServer(self)
        self._socket_server.message_received.connect(self._on_voice_message)
        self._socket_server.state_received.connect(self.set_state)
        self._socket_server.display_user.connect(
            lambda t: self._chat.push_message(t, sender="user")
        )
        self._socket_server.display_aura.connect(
            lambda t: self._chat.push_message(t, sender="aura")
        )
        self._socket_server.discord_message.connect(self._on_discord_message)

        self._collapse_timer = QTimer(self)
        self._collapse_timer.setSingleShot(True)
        self._collapse_timer.timeout.connect(self._collapse)

        self._tray: QSystemTrayIcon | None = None
        self._setup_tray()

        self._sc_focus  = QShortcut(QKeySequence("Ctrl+K"), self)
        self._sc_focus.activated.connect(self._focus_chat)
        self._sc_toggle = QShortcut(QKeySequence("Ctrl+Space"), self)
        self._sc_toggle.activated.connect(self._toggle_expand)

        app = QApplication.instance()
        if isinstance(app, QApplication):
            app.installEventFilter(self)

        self.resize(_COLLAPSED, _COLLAPSED)
        self.set_state("idle")
        self._place_top_right()

    # --- Build UI -----------------------------------------------------------

    def _build_icon_page(self) -> None:
        page = _IconDragWidget(self)
        page.setFixedSize(_COLLAPSED, _COLLAPSED)
        page.setStyleSheet("background: transparent;")
        lay = QVBoxLayout(page)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addStretch(1)
        self._orb_icon = PulseOrb(36, page)
        row = QHBoxLayout()
        row.addStretch(1)
        row.addWidget(self._orb_icon, 0, Qt.AlignmentFlag.AlignCenter)
        row.addStretch(1)
        lay.addLayout(row)
        lay.addStretch(1)
        self._stack.addWidget(page)
        self._orb_icon.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)

    def _build_expanded_page(self) -> None:
        page = QWidget()
        page.setStyleSheet("background: transparent;")
        root = QVBoxLayout(page)
        root.setContentsMargins(10, 10, 10, 10)
        root.setSpacing(8)

        # ── HUD bar ───────────────────────────────────────────────────────────
        self._hud_bar = _HudDragFrame(self, page)
        self._hud_bar.setFixedHeight(_HUD_H)
        self._hud_bar.setStyleSheet(
            f"background: {THEME['panel_bg']}; border-radius: 10px;"
        )
        hud_lay = QVBoxLayout(self._hud_bar)
        hud_lay.setContentsMargins(12, 8, 12, 8)
        hud_lay.setSpacing(4)

        row_top = QHBoxLayout()
        self._title_lbl = QLabel("◈  AURA SYSTEM  ◈")
        self._title_lbl.setStyleSheet(
            f"color: rgba(0,255,180,120); font-family: {THEME['font_mono']}; "
            f"font-size: 11px; letter-spacing: 4px;"
        )
        row_top.addWidget(self._title_lbl, 0, Qt.AlignmentFlag.AlignLeft)

        self._uplink_lbl = QLabel("UPLINK: …")
        self._uplink_lbl.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 9px;"
        )
        row_top.addWidget(self._uplink_lbl, 0, Qt.AlignmentFlag.AlignLeft)
        row_top.addStretch(1)

        self._orb_hud = PulseOrb(16, self._hud_bar)
        self._orb_hud.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        row_top.addWidget(self._orb_hud, 0, Qt.AlignmentFlag.AlignRight)

        self._btn_expand = QPushButton("▼")
        self._btn_expand.setFixedSize(28, 28)
        self._btn_expand.setCursor(Qt.CursorShape.PointingHandCursor)
        self._btn_expand.setStyleSheet(
            f"QPushButton {{ color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; "
            f"border: 1px solid {THEME['aura_border']}; border-radius: 6px; background: transparent; }}"
            f"QPushButton:hover {{ background: {THEME['aura_bubble']}; }}"
        )
        self._btn_expand.clicked.connect(self._toggle_expand)
        row_top.addWidget(self._btn_expand, 0, Qt.AlignmentFlag.AlignRight)
        hud_lay.addLayout(row_top)

        row_mid = QHBoxLayout()
        self._status_main = QLabel()
        self._status_main.setStyleSheet(
            f"color: {THEME['text']}; font-family: {THEME['font_mono']}; font-size: 15px; "
            f"font-weight: bold; letter-spacing: 3px;"
        )
        row_mid.addWidget(self._status_main, 0, Qt.AlignmentFlag.AlignLeft)
        self._wave = WaveBar(self._hud_bar)
        self._wave.setFixedWidth(80)
        row_mid.addWidget(self._wave, 0, Qt.AlignmentFlag.AlignLeft)
        row_mid.addStretch(1)
        hud_lay.addLayout(row_mid)

        self._status_sub = QLabel()
        self._status_sub.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 10px;"
        )
        hud_lay.addWidget(self._status_sub)

        root.addWidget(self._hud_bar)
        self._brackets_hud = CornerBrackets(STATE_CFG["idle"]["accent"], self._hud_bar)
        self._brackets_hud.raise_()

        # ── Tab bar — CHAT | DISCORD | WIDGETS ───────────────────────────────
        tab_row = QHBoxLayout()
        tab_row.setSpacing(6)
        self._tab_chat    = QPushButton("◈  CHAT")
        self._tab_discord = QPushButton("◈  DISCORD")
        self._tab_widgets = QPushButton("◈  WIDGETS")

        _tab_style = (
            f"QPushButton {{ color: {THEME['dim']}; font-family: {THEME['font_mono']}; "
            f"font-size: 11px; letter-spacing: 2px; border: 1px solid rgba(0,255,180,35); "
            f"border-radius: 8px; padding: 4px 16px; background: rgba(6,10,18,180); }}"
            f"QPushButton:checked {{ color: {THEME['aura_border']}; "
            f"background: rgba(0,255,180,12); border-color: {THEME['aura_border']}; }}"
            f"QPushButton:hover {{ color: {THEME['text']}; }}"
        )
        for b in (self._tab_chat, self._tab_discord, self._tab_widgets):
            b.setCheckable(True)
            b.setAutoExclusive(True)
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            b.setFixedHeight(_TAB_H)
            b.setStyleSheet(_tab_style)

        self._tab_chat.setChecked(True)
        self._tab_chat.clicked.connect(lambda: self._set_tab(0))
        self._tab_discord.clicked.connect(lambda: self._set_tab(1))
        self._tab_widgets.clicked.connect(lambda: self._set_tab(2))
        tab_row.addWidget(self._tab_chat)
        tab_row.addWidget(self._tab_discord)
        tab_row.addWidget(self._tab_widgets)
        tab_row.addStretch(1)
        root.addLayout(tab_row)

        # ── Tab stack ─────────────────────────────────────────────────────────
        self._tab_stack = QStackedWidget()

        # Tab 0 — Chat
        self._chat = ChatPanel()
        self._chat.setMinimumHeight(380)

        # Tab 1 — Discord
        self._discord_panel = DiscordPanel()
        self._discord_panel.activate_requested.connect(self._on_discord_activate)

        # Tab 2 — Widgets (stub)
        self._widgets_stub = QWidget()
        ws = QVBoxLayout(self._widgets_stub)
        stub = QLabel("◈  WIDGETS MODULE — STANDBY")
        stub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        stub.setStyleSheet(
            f"color: {THEME['dim']}; font-family: {THEME['font_mono']}; font-size: 12px;"
        )
        ws.addWidget(stub)

        self._tab_stack.addWidget(self._chat)
        self._tab_stack.addWidget(self._discord_panel)
        self._tab_stack.addWidget(self._widgets_stub)

        self._chat_shell = QFrame()
        self._chat_shell.setObjectName("chatShell")
        self._chat_shell.setStyleSheet(
            "QFrame#chatShell {"
            " background: rgba(6,10,18,215);"
            " border: 1px solid rgba(0,255,180,30);"
            " border-radius: 14px;"
            "}"
        )
        shell_lay = QVBoxLayout(self._chat_shell)
        shell_lay.setContentsMargins(10, 10, 10, 10)
        shell_lay.addWidget(self._tab_stack)

        self._chat_glow = QGraphicsDropShadowEffect(self._chat_shell)
        self._chat_glow.setBlurRadius(26)
        self._chat_glow.setOffset(0, 0)
        self._chat_glow.setColor(QColor(STATE_CFG["idle"]["accent"]))
        self._chat_shell.setGraphicsEffect(self._chat_glow)

        self._brackets_panel = CornerBrackets(STATE_CFG["idle"]["accent"], self._chat_shell)
        self._brackets_panel.raise_()

        root.addWidget(self._chat_shell, stretch=1)
        self._stack.addWidget(page)

    def _set_tab(self, index: int) -> None:
        self._tab_stack.setCurrentIndex(index)
        self._tab_chat.setChecked(index == 0)
        self._tab_discord.setChecked(index == 1)
        self._tab_widgets.setChecked(index == 2)
        self._arm_collapse_timer()

    def _setup_tray(self) -> None:
        if not QSystemTrayIcon.isSystemTrayAvailable():
            logger.warning("System tray not available — tray menu disabled.")
            return
        pix = QPixmap(32, 32)
        pix.fill(Qt.GlobalColor.transparent)
        p = QPainter(pix)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setBrush(QColor(0, 255, 180))
        p.setPen(Qt.PenStyle.NoPen)
        p.drawEllipse(4, 4, 24, 24)
        p.end()
        self._tray = QSystemTrayIcon(QIcon(pix), self)
        menu = QMenu()
        act_show = QAction("Show", self)
        act_show.triggered.connect(self.show)
        act_hide = QAction("Hide", self)
        act_hide.triggered.connect(self.hide)
        act_quit = QAction("Quit", self)
        act_quit.triggered.connect(self._quit_from_tray)
        menu.addAction(act_show)
        menu.addAction(act_hide)
        menu.addSeparator()
        menu.addAction(act_quit)
        self._tray.setContextMenu(menu)
        self._tray.activated.connect(self._on_tray_activated)
        self._tray.show()

    def _on_tray_activated(self, reason: QSystemTrayIcon.ActivationReason) -> None:
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            if self.isVisible():
                self.hide()
            else:
                self.show()
                self.raise_()
                self.activateWindow()

    # --- State / expand -----------------------------------------------------

    def set_state(self, state: str) -> None:
        if state not in STATE_CFG:
            logger.warning("Unknown state %r — ignoring.", state)
            return
        self._state_key = state
        cfg    = STATE_CFG[state]
        orb    = cfg["orb"]
        accent = cfg["accent"]

        if self._tts:
            if state == "listening":
                self._tts.pause()
            elif state in ("thinking", "speaking", "idle"):
                self._tts.resume()

        self._orb_icon.set_color(orb)
        self._orb_hud.set_color(orb)
        self._wave.set_active(cfg["wave"], orb)
        self._status_main.setText(cfg["label"])
        self._status_sub.setText(cfg["sub"])
        self._brackets_hud.set_color(accent)
        self._brackets_panel.set_color(accent)
        self._chat_glow.setColor(QColor(accent))

    def _toggle_expand(self) -> None:
        if self._expanded:
            self._collapse()
        else:
            self._expand()

    def _expand(self) -> None:
        if self._expanded:
            return
        self._expanded = True
        self._stack.setCurrentIndex(1)
        self._chat.setVisible(True)
        self._btn_expand.setText("▲")
        self._run_resize_anim(_EXPANDED_W, _EXPANDED_H, finished=None)
        self._arm_collapse_timer()

    def _collapse(self) -> None:
        if not self._expanded:
            return
        if self._chat.is_streaming():
            self._arm_collapse_timer()
            return
        self._expanded = False
        self._collapse_timer.stop()

        def _done() -> None:
            self._stack.setCurrentIndex(0)
            self._chat.setVisible(False)
            self._btn_expand.setText("▼")

        self._run_resize_anim(_COLLAPSED, _COLLAPSED, finished=_done)

    def _run_resize_anim(self, w: int, h: int, finished: Callable[[], None] | None) -> None:
        if self._geom_anim is not None:
            self._geom_anim.stop()
        anim = QVariantAnimation(self)
        anim.setDuration(320)
        anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        g0 = self.geometry()
        anim.setStartValue(QRect(g0.x(), g0.y(), self.width(), self.height()))
        anim.setEndValue(QRect(g0.x(), g0.y(), w, h))

        def _apply(v: object) -> None:
            if isinstance(v, QRect):
                self.setGeometry(v)

        anim.valueChanged.connect(_apply)
        if finished is not None:
            anim.finished.connect(finished)
        anim.start()
        self._geom_anim = anim

    def _on_icon_hover(self) -> None:
        if not self._expanded:
            self._expand()

    def _on_icon_click(self) -> None:
        if not self._expanded:
            self._expand()

    def _arm_collapse_timer(self) -> None:
        if not self._expanded:
            return
        if self._chat.is_streaming():
            return
        self._collapse_timer.start(3000)

    def _place_top_right(self) -> None:
        screen = QGuiApplication.primaryScreen()
        if screen is None:
            return
        g = screen.availableGeometry()
        self.move(g.right() - self.width() - 20, g.top() + 20)

    def resizeEvent(self, event: QResizeEvent) -> None:
        super().resizeEvent(event)
        r = self.rect()
        self._particles.setGeometry(r)
        self._scan.setGeometry(r)
        self._front.setGeometry(r)
        if hasattr(self, "_hud_bar"):
            self._brackets_hud.setGeometry(self._hud_bar.rect())
        if hasattr(self, "_chat_shell"):
            self._brackets_panel.setGeometry(self._chat_shell.rect())

    # --- Workers / chat -----------------------------------------------------

    def _on_health_changed(self, online: bool) -> None:
        if online:
            self._uplink_lbl.setText("UPLINK: NOMINAL")
            self._uplink_lbl.setStyleSheet(
                f"color: {THEME['aura_border']}; font-family: {THEME['font_mono']}; font-size: 9px;"
            )
        else:
            self._uplink_lbl.setText("UPLINK: OFFLINE")
            self._uplink_lbl.setStyleSheet(
                "color: rgba(255,80,80,200); font-family: monospace; font-size: 9px;"
            )

    def _on_voice_message(self, text: str) -> None:
        t = text.strip()
        if not t:
            return
        if not self._expanded:
            self._expand()
        self._chat.push_message(t, "user")
        self._chat.append_api_history({"role": "user", "content": t})
        self._chat.message_sent.emit(t)

    def _on_discord_activate(self, user_id: str) -> None:
        """Called when Kenaz hits Activate in the Discord tab."""
        try:
            from comms.discord_bot import activate
            activate(user_id)
            logger.info("Discord: activation requested for user %s", user_id)
        except Exception as e:
            logger.error("Discord: activation error: %s", e)

    def _on_discord_message(self, sender: str, message: str) -> None:
        """Called when friend replies to the bot — show in Discord tab + TTS."""
        if not self._expanded:
            self._expand()
        # Switch to Discord tab so Kenaz sees it
        self._set_tab(1)
        self._tab_discord.setChecked(True)
        self._discord_panel.push_message(sender, message)

    def _start_backend_stream(self, message_text: str) -> None:
        if self._stream_worker is not None and self._stream_worker.isRunning():
            return
        self.set_state("thinking")
        self._chat.start_stream()
        self._stream_worker = BackendStream(
            message=message_text,
            history=self._chat.history_for_backend(),
            mode="deep",
            parent=self,
        )
        self._stream_worker.chunk_received.connect(self._chat.append_stream)
        self._stream_worker.done.connect(self._on_stream_finished)
        self._stream_worker.error.connect(self._on_stream_error)
        self._stream_worker.start()
        self._arm_collapse_timer()

    def _on_stream_finished(self) -> None:
        full_text = self._chat.get_last_assistant_message()
        self._chat.end_stream()
        self.set_state("idle")
        if self._tts and full_text:
            self._tts.speak(full_text)
        if self._stream_worker is not None:
            self._stream_worker.deleteLater()
            self._stream_worker = None
        self._arm_collapse_timer()

    def _on_stream_error(self, message: str) -> None:
        self._chat.append_stream(f"\n[ uplink error — {message} ]")
        self._chat.end_stream()
        self.set_state("error")
        if self._stream_worker is not None:
            self._stream_worker.deleteLater()
            self._stream_worker = None
        self._arm_collapse_timer()

    def _focus_chat(self) -> None:
        if not self._expanded:
            self._expand()
        self._set_tab(0)
        self._chat.focus_chat_input()

    # --- Qt overrides -------------------------------------------------------

    def eventFilter(self, watched: QObject, event: QEvent) -> bool:
        if self._expanded and event.type() in (
            QEvent.Type.MouseMove,
            QEvent.Type.MouseButtonPress,
            QEvent.Type.Wheel,
            QEvent.Type.KeyPress,
        ):
            if isinstance(watched, QWidget) and self.isAncestorOf(watched):
                self._arm_collapse_timer()
        return super().eventFilter(watched, event)

    def showEvent(self, event: QShowEvent) -> None:
        super().showEvent(event)
        self._place_top_right()

    def closeEvent(self, event: QCloseEvent) -> None:
        if self._tray is not None:
            event.ignore()
            self.hide()
            return
        self._stop_workers()
        event.accept()

    def _quit_from_tray(self) -> None:
        self._stop_workers()
        QApplication.quit()

    def _stop_workers(self) -> None:
        self._health.stop()
        self._socket_server.stop()
        if self._stream_worker is not None:
            if self._stream_worker.isRunning():
                self._stream_worker.wait(5000)
            self._stream_worker.deleteLater()
            self._stream_worker = None

    def start_workers(self) -> None:
        self._health.start()
        self._socket_server.start()


def start(tts: any = None) -> int:
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    app.setFont(QFont(THEME["font_ui"], 11))

    win = AuraUI(tts=tts)
    win.setWindowTitle("Aura")
    win.start_workers()
    win.show()

    return int(app.exec())