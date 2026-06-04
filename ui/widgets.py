"""Canvas primitives — PulseOrb, WaveBar, ParticleBackground, ScanLine, CornerBrackets."""

import math
import random

from PySide6.QtWidgets import QWidget, QGraphicsDropShadowEffect
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QPainter, QColor, QPen, QBrush, QRadialGradient, QLinearGradient, QPainterPath

from ui.theme import THEME


# ── Pulse Orb ─────────────────────────────────────────────────────────────────

class PulseOrb(QWidget):
    def __init__(self, size=16, parent=None):
        super().__init__(parent)
        self.setFixedSize(size, size)
        self._phase = 0.0
        self._color = QColor(0, 200, 140)

        self.glow = QGraphicsDropShadowEffect(self)
        self.glow.setBlurRadius(12)
        self.glow.setColor(self._color)
        self.glow.setOffset(0, 0)
        self.setGraphicsEffect(self.glow)

        t = QTimer(self)
        t.timeout.connect(self._tick)
        t.start(30)

    def _tick(self):
        self._phase = (self._phase + 0.07) % (2 * math.pi)
        self.update()

    def set_color(self, c: QColor):
        self._color = c
        self.glow.setColor(c)
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        pulse = (math.sin(self._phase) + 1) / 2
        cx, cy = self.width() / 2, self.height() / 2

        r_out = (self.width() / 2) * 0.7
        gr = QRadialGradient(cx, cy, r_out + pulse * (self.width() / 5.0))
        gc = QColor(self._color)
        gc.setAlpha(int(55 * pulse))
        gr.setColorAt(0, gc)
        gr.setColorAt(1, QColor(0, 0, 0, 0))
        p.setBrush(QBrush(gr))
        p.setPen(Qt.PenStyle.NoPen)
        r_draw = r_out * 1.5
        p.drawEllipse(int(cx - r_draw), int(cy - r_draw), int(r_draw * 2), int(r_draw * 2))

        r_in = (self.width() / 2) * 0.4
        core = QRadialGradient(cx, cy, r_in * 1.2)
        core.setColorAt(0, self._color.lighter(170))
        core.setColorAt(1, self._color)
        p.setBrush(QBrush(core))
        p.drawEllipse(int(cx - r_in), int(cy - r_in), int(r_in * 2), int(r_in * 2))


# ── Wave Bar ──────────────────────────────────────────────────────────────────

class WaveBar(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(22)
        self._active = False
        self._phase = 0.0
        self._color = QColor(0, 200, 140)
        self._bars = 28

        t = QTimer(self)
        t.timeout.connect(self._tick)
        t.start(35)

    def _tick(self):
        self._phase += 0.18 if self._active else 0.025
        self.update()

    def set_active(self, active: bool, color: QColor = None):
        self._active = active
        if color:
            self._color = color

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()
        sp = w / self._bars
        bw = max(2, int(sp) - 2)

        for i in range(self._bars):
            amp = 0.12 if not self._active else 0.60
            r = amp * (
                math.sin(self._phase * (1.8 + i * 0.07) + i * 0.4) * 0.6 +
                math.sin(self._phase * (2.5 - i * 0.04) + i * 0.9) * 0.4
            )
            r = max(0.04, abs(r))
            bh = int(r * h)
            x = int(i * sp + (sp - bw) / 2)
            y = (h - bh) // 2
            c = QColor(self._color)
            c.setAlpha(int(160 + 95 * math.sin(self._phase + i * 0.3)))
            p.setBrush(QBrush(c))
            p.setPen(Qt.PenStyle.NoPen)
            p.drawRoundedRect(x, y, bw, bh, 2, 2)


# ── Particle Background ───────────────────────────────────────────────────────

class ParticleBackground(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self._particles = []
        self._init_particles()

        t = QTimer(self)
        t.timeout.connect(self._update)
        t.start(50)

    def _init_particles(self):
        for _ in range(20):
            self._particles.append({
                "x": random.uniform(0, 800),
                "y": random.uniform(0, 800),
                "vx": random.uniform(-0.5, 0.5),
                "vy": random.uniform(-1.0, -0.2),
                "size": random.uniform(1.5, 3.5),
                "alpha": random.uniform(20, 100),
            })

    def _update(self):
        w, h = self.width(), self.height()
        for p in self._particles:
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            if p["y"] < 0:
                p["y"] = h
                p["x"] = random.uniform(0, w)
            if p["x"] < 0:
                p["x"] = w
            if p["x"] > w:
                p["x"] = 0
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setPen(Qt.PenStyle.NoPen)
        for pt in self._particles:
            c = QColor(0, 255, 180, int(pt["alpha"]))
            p.setBrush(QBrush(c))
            p.drawEllipse(int(pt["x"]), int(pt["y"]), int(pt["size"]), int(pt["size"]))


# ── Scan Line ─────────────────────────────────────────────────────────────────

class ScanLine(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self._y = 0

        t = QTimer(self)
        t.timeout.connect(self._tick)
        t.start(16)

    def _tick(self):
        self._y = (self._y + 1) % max(1, self.height())
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        gr = QLinearGradient(0, self._y - 12, 0, self._y + 4)
        gr.setColorAt(0, QColor(0, 0, 0, 0))
        gr.setColorAt(0.6, QColor(0, 255, 180, 12))
        gr.setColorAt(1, QColor(0, 0, 0, 0))
        p.fillRect(0, max(0, self._y - 12), self.width(), 16, QBrush(gr))
        p.setPen(QPen(QColor(255, 255, 255, 4)))
        for y in range(0, self.height(), 4):
            p.drawLine(0, y, self.width(), y)


# ── Corner Brackets ───────────────────────────────────────────────────────────

class CornerBrackets(QWidget):
    def __init__(self, color="#00c88c", parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self._color = QColor(color)
        self._color.setAlpha(140)

    def set_color(self, hex_: str):
        self._color = QColor(hex_)
        self._color.setAlpha(140)
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setPen(QPen(self._color, 1.5))
        p.setBrush(Qt.BrushStyle.NoBrush)
        w, h = self.width(), self.height()
        L = 18 if w > 100 else 8
        m = 10 if w > 100 else 4

        for pts in [
            [(m + L, m), (m, m), (m, m + L)],
            [(w - m - L, m), (w - m, m), (w - m, m + L)],
            [(m + L, h - m), (m, h - m), (m, h - m - L)],
            [(w - m - L, h - m), (w - m, h - m), (w - m, h - m - L)],
        ]:
            path = QPainterPath()
            path.moveTo(*pts[0])
            path.lineTo(*pts[1])
            path.lineTo(*pts[2])
            p.drawPath(path)